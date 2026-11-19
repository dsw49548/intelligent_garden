require 'sinatra'
require 'json'
require 'sequel'
require 'time'
require 'rack/cors'
require 'dotenv/load'
require 'cgi'
require 'bcrypt'
require 'securerandom'
require_relative 'lib/trefle_client'

use Rack::Cors do
  allow do
    origins 'http://localhost:5173', 'http://localhost:4173', 'http://127.0.0.1:4173', 'http://127.0.0.1:5173'
    resource '/api/*', headers: ['Content-Type', 'Authorization'], methods: [:get, :post, :put, :delete, :options]
  end
end

set :bind, '0.0.0.0'
set :port, 4567
set :server, "webrick"

DB_PATH = ENV['DB_PATH'] || File.expand_path(File.join(__dir__, "db.sqlite3"))
DB = Sequel.connect("sqlite://#{DB_PATH}")

begin
  DB.run("PRAGMA journal_mode=WAL")
rescue => e
  puts "#{e.class} #{e.message}"
  exit 1
end

DB.create_table? :measurements do
  primary_key :id
  Integer :plant_id, null: false
  String :measured_at, null: false
  Integer :soil_moisture, null: false
  Real :air_temp_c, null: false
  Real :air_humidity, null: false
  Integer :light_lux, null: false
  String :created_at, null: false
end

DB.create_table? :users do
  primary_key :id
  String :username, null: false, unique: true
  String :password_digest, null: false
  String :created_at, null: false
end

DB.create_table? :sessions do
  String :token, primary_key: true
  Integer :user_id, null: false
  String :created_at, null: false
end

DB.create_table? :plants do
  primary_key :id
  Integer :user_id, null: false
  String :name, null: false
  String :scientific_name
  Integer :trefle_id
  String :image_url
  Integer :soil_min, null: false
  Integer :soil_max, null: false
  Real :temp_min, null: false
  Real :temp_max, null: false
  Integer :hum_min, null: false
  Integer :hum_max, null: false
  Integer :light_min, null: false
  Integer :light_max, null: false
  String :created_at, null: false
end

THRESHOLD_KEYS = %w[soil_min soil_max temp_min temp_max hum_min hum_max light_min light_max]

DEFAULT_THRESHOLDS = {
  'soil_min' => 30, 'soil_max' => 70,
  'temp_min' => 18, 'temp_max' => 28,
  'hum_min' => 40, 'hum_max' => 70,
  'light_min' => 500, 'light_max' => 5000
}

before do
  content_type :json
end

def now
  Time.now.utc.iso8601
end

def error!(code, message)
  halt code, { error: message }.to_json
end

def json_body
  data = JSON.parse(request.body.read)
  error!(400, 'invalid JSON') unless data.is_a?(Hash)
  data
rescue JSON::ParserError
  error!(400, 'invalid JSON')
end

def bearer_token
  request.env['HTTP_AUTHORIZATION'].to_s.sub(/\ABearer /, '')
end

def current_user
  return @user if @user
  session = DB[:sessions].where(token: bearer_token).first unless bearer_token.empty?
  error!(401, 'unauthorized') unless session
  @user = DB[:users].where(id: session[:user_id]).first
  error!(401, 'unauthorized') unless @user
  @user
end

def find_plant(id)
  plant = DB[:plants].where(id: id.to_i, user_id: current_user[:id]).first
  error!(404, 'not found') unless plant
  plant
end

def login_response(user)
  token = SecureRandom.hex(32)
  DB[:sessions].insert(token: token, user_id: user[:id], created_at: now)
  { token: token, user: { id: user[:id], username: user[:username] } }.to_json
end

def validate_thresholds(t)
  THRESHOLD_KEYS.each do |key|
    return "invalid field: #{key}" unless t[key].is_a?(Numeric)
  end
  %w[soil temp hum light].each do |name|
    return "#{name}_min must be <= #{name}_max" if t["#{name}_min"] > t["#{name}_max"]
  end
  %w[soil_min soil_max hum_min hum_max].each do |key|
    return "out of range: #{key} (0-100)" unless t[key].between?(0, 100)
  end
  return 'out of range: light_min (>= 0)' if t['light_min'] < 0
  nil
end

def plant_fields(data, old)
  fields = {}
  if data.key?('name') || old.nil?
    name = data['name'].to_s.strip
    error!(400, 'name must be 1-50 characters') unless name.length.between?(1, 50)
    fields[:name] = name
  end
  thresholds = THRESHOLD_KEYS.to_h { |k| [k, data.key?(k) ? data[k] : (old ? old[k.to_sym] : DEFAULT_THRESHOLDS[k])] }
  error_message = validate_thresholds(thresholds)
  error!(400, error_message) if error_message
  thresholds.each { |k, v| fields[k.to_sym] = v }
  fields
end

def validate_measurement(data)
  required_fields = %w[plant_id measured_at soil_moisture air_temp_c air_humidity light_lux]
  required_fields.each do |field|
    unless data.key?(field)
      return { error: "missing field: #{field}" }
    end
  end

  unless data['plant_id'].is_a?(Integer) && data['plant_id'] > 0
    return { error: 'invalid field: plant_id' }
  end

  begin
    Time.iso8601(data['measured_at'])
  rescue
    return { error: 'invalid field: measured_at' }
  end

  unless data['soil_moisture'].is_a?(Integer) && data['soil_moisture'] >= 0 && data['soil_moisture'] <= 100
    return { error: 'out of range: soil_moisture' }
  end

  unless (data['air_temp_c'].is_a?(Numeric))
    return { error: 'invalid field: air_temp_c' }
  end

  unless (data['air_humidity'].is_a?(Numeric)) && data['air_humidity'] >= 0 && data['air_humidity'] <= 100
    return { error: 'out of range: air_humidity' }
  end

  unless data['light_lux'].is_a?(Integer) && data['light_lux'] >= 0
    return { error: 'out of range: light_lux' }
  end

  nil
end

TREFLE_TOKEN = ENV['TREFLE_TOKEN']

def fetch_trefle(path)
  error!(500, 'TREFLE_TOKEN is missing') unless TREFLE_TOKEN && !TREFLE_TOKEN.empty?
  TrefleClient.fetch(path, TREFLE_TOKEN)
end

def extract_native_to(data)
  return nil unless data

  main_species = data['main_species'] || data
  distribution = main_species['distribution'] || {}
  native = distribution['native'] || []

  if native.is_a?(Array) && native.length > 0
    regions = native.first(5).map { |r| r.is_a?(Hash) ? r['name'] || r['slug'] : r.to_s }.compact
    return regions.join(', ') + (native.length > 5 ? '...' : '') if regions.length > 0
  end

  observations = main_species['observations'] || []
  if observations.is_a?(Array) && observations.length > 0
    obs_text = observations.first(3).map { |o| o.is_a?(Hash) ? o['name'] || o['slug'] : o.to_s }.compact.join(', ')
    return obs_text if obs_text.length > 0 && obs_text.length < 100
  end

  nil
end

def extract_string_value(value)
  return nil if value.nil?
  return value if value.is_a?(String)
  return value['name'] if value.is_a?(Hash) && value['name']
  nil
end

def map_plant_details(trefle_data)
  return nil unless trefle_data && trefle_data['data']

  data = trefle_data['data']
  main_species = data['main_species'] || {}

  family_val = extract_string_value(data['family']) || extract_string_value(main_species['family'])
  genus_val = extract_string_value(data['genus']) || extract_string_value(main_species['genus'])
  family_common_name_val = data['family_common_name'] || main_species['family_common_name']

  result = {
    id: data['id'],
    common_name: data['common_name'],
    scientific_name: data['scientific_name'] || main_species['scientific_name'],
    family: family_val,
    family_common_name: family_common_name_val,
    genus: genus_val,
    image_url: data['image_url'] || main_species['image_url'],
    native_to: extract_native_to(data)
  }

  result.reject { |k, v| v.nil? || (v.is_a?(String) && v.empty?) }
end

# Trefle growth data: light, atmospheric_humidity, soil_humidity are 0-10 scales,
# temperatures are in data.main_species.growth.*_temperature.deg_c
def map_recommendations(trefle_data)
  growth = trefle_data.dig('data', 'main_species', 'growth') || {}
  rec = DEFAULT_THRESHOLDS.dup

  if growth['soil_humidity']
    rec['soil_min'] = [growth['soil_humidity'] * 10 - 10, 0].max
    rec['soil_max'] = [growth['soil_humidity'] * 10 + 10, 100].min
  end
  if growth['atmospheric_humidity']
    rec['hum_min'] = [growth['atmospheric_humidity'] * 10 - 10, 0].max
    rec['hum_max'] = [growth['atmospheric_humidity'] * 10 + 10, 100].min
  end
  if growth['light']
    rec['light_min'] = growth['light'] * 1000
    rec['light_max'] = [growth['light'] * 2000, 20000].min
  end

  temp_min = growth.dig('minimum_temperature', 'deg_c')
  temp_max = growth.dig('maximum_temperature', 'deg_c')
  rec['temp_min'] = temp_min if temp_min
  rec['temp_max'] = temp_max if temp_max
  rec['temp_min'], rec['temp_max'] = DEFAULT_THRESHOLDS.values_at('temp_min', 'temp_max') if rec['temp_min'] > rec['temp_max']

  rec
end

get '/health' do
  { status: 'ok' }.to_json
end

post '/api/register' do
  data = json_body
  username = data['username'].to_s.strip
  password = data['password'].to_s
  error!(400, 'username must be 3-30 characters') unless username.length.between?(3, 30)
  error!(400, 'password must be at least 6 characters') if password.length < 6

  begin
    id = DB[:users].insert(username: username, password_digest: BCrypt::Password.create(password), created_at: now)
  rescue Sequel::UniqueConstraintViolation
    error!(409, 'username already taken')
  end

  status 201
  login_response(DB[:users].where(id: id).first)
end

post '/api/login' do
  data = json_body
  user = DB[:users].where(username: data['username'].to_s.strip).first
  unless user && BCrypt::Password.new(user[:password_digest]) == data['password'].to_s
    error!(401, 'invalid username or password')
  end
  login_response(user)
end

post '/api/logout' do
  current_user
  DB[:sessions].where(token: bearer_token).delete
  { status: 'ok' }.to_json
end

get '/api/me' do
  { id: current_user[:id], username: current_user[:username] }.to_json
end

get '/api/plants' do
  DB[:plants].where(user_id: current_user[:id]).order(:id).all.to_json
end

post '/api/plants' do
  data = json_body
  fields = plant_fields(data, nil)
  fields[:user_id] = current_user[:id]
  fields[:scientific_name] = data['scientific_name']&.to_s
  fields[:trefle_id] = data['trefle_id'] if data['trefle_id'].is_a?(Integer)
  fields[:image_url] = data['image_url']&.to_s
  fields[:created_at] = now
  id = DB[:plants].insert(fields)
  status 201
  DB[:plants].where(id: id).first.to_json
end

get '/api/plants/:id' do
  find_plant(params['id']).to_json
end

put '/api/plants/:id' do
  plant = find_plant(params['id'])
  DB[:plants].where(id: plant[:id]).update(plant_fields(json_body, plant))
  DB[:plants].where(id: plant[:id]).first.to_json
end

delete '/api/plants/:id' do
  plant = find_plant(params['id'])
  DB.transaction do
    DB[:measurements].where(plant_id: plant[:id]).delete
    DB[:plants].where(id: plant[:id]).delete
  end
  { status: 'ok' }.to_json
end

delete '/api/plants/:id/measurements' do
  plant = find_plant(params['id'])
  deleted = DB[:measurements].where(plant_id: plant[:id]).delete
  { status: 'ok', deleted: deleted }.to_json
end

get '/api/trefle/search' do
  current_user
  query = params['q']
  unless query && query.length >= 2
    status 400
    return { error: 'query too short (min 2 chars)' }.to_json
  end

  result = fetch_trefle("/plants/search?q=#{CGI.escape(query)}&limit=100")

  if result && result['data']
    q = query.downcase.strip
    plants = result['data'].first(100).map do |plant|
      {
        id: plant['id'],
        scientific_name: plant['scientific_name'],
        common_name: plant['common_name'],
        family: plant['family'],
        family_common_name: plant['family_common_name'],
        genus: plant['genus'],
        image_url: plant['image_url'],
        slug: plant['slug']
      }
    end
    plants.select! do |p|
      (p[:common_name] || '').downcase.include?(q) || (p[:scientific_name] || '').downcase.include?(q)
    end
    plants.sort_by! do |p|
      cn = (p[:common_name] || '').downcase
      sn = (p[:scientific_name] || '').downcase
      if cn.start_with?(q)
        [0, cn]
      elsif sn.start_with?(q)
        [1, sn]
      elsif cn.include?(q)
        [2, cn]
      elsif sn.include?(q)
        [3, sn]
      else
        [4, cn]
      end
    end
    { data: plants.first(15) }.to_json
  else
    status 404
    { error: 'not found' }.to_json
  end
end

get '/api/trefle/:id' do
  current_user
  mapped = map_plant_details(fetch_trefle("/plants/#{params['id'].to_i}"))
  error!(404, 'not found') unless mapped
  mapped.to_json
end

get '/api/trefle/:id/recommendations' do
  current_user
  result = fetch_trefle("/plants/#{params['id'].to_i}")
  error!(404, 'not found') unless result && result['data']
  { recommendations: map_recommendations(result) }.to_json
end

post '/api/measurements' do
  data = json_body

  validation_error = validate_measurement(data)
  if validation_error
    status 400
    return validation_error.to_json
  end

  error!(404, 'unknown plant') if DB[:plants].where(id: data['plant_id']).empty?

  id = DB[:measurements].insert(
    plant_id: data['plant_id'],
    measured_at: data['measured_at'],
    soil_moisture: data['soil_moisture'],
    air_temp_c: data['air_temp_c'],
    air_humidity: data['air_humidity'],
    light_lux: data['light_lux'],
    created_at: now
  )

  status 201
  DB[:measurements].where(id: id).first.to_json
end

get '/api/measurements/latest' do
  plant = find_plant(params['plant_id'])

  record = DB[:measurements]
    .where(plant_id: plant[:id])
    .order(Sequel.desc(:measured_at))
    .first

  error!(404, 'not found') unless record
  record.to_json
end

get '/api/measurements' do
  plant = find_plant(params['plant_id'])

  limit = params['limit'] ? params['limit'].to_i : 100
  if limit < 1 || limit > 500
    status 400
    return { error: 'limit out of range (1-500)' }.to_json
  end

  DB[:measurements]
    .where(plant_id: plant[:id])
    .order(Sequel.desc(:measured_at))
    .limit(limit)
    .all
    .to_json
end
