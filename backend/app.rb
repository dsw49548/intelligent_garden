require 'sinatra'
require 'json'
require 'sequel'
require 'time'
require 'rack/cors'
require 'dotenv/load'
require 'cgi'
require 'bcrypt'
require 'securerandom'
require 'webrick'
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
set :show_exceptions, :after_handler
disable :method_override

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

NEW_PLANT_COLUMNS = {
  device_id: [String, nil],
  auto_watering: [TrueClass, false],
  soil_trigger: [Integer, 30],
  pump_ms: [Integer, 2000],
  min_interval_min: [Integer, 30],
  soak_s: [Integer, 60],
  min_rise: [Integer, 5],
  blocked: [TrueClass, false],
  block_reason: [String, nil],
  water_now: [TrueClass, false]
}
NEW_PLANT_COLUMNS.each do |name, (type, default)|
  DB.add_column(:plants, name, type, default: default) unless DB[:plants].columns.include?(name)
end

DB.add_index :measurements, [:plant_id, :measured_at] unless DB.indexes(:measurements).key?(:measurements_plant_id_measured_at_index)

DB.create_table? :waterings do
  primary_key :id
  Integer :plant_id, null: false
  String :started_at, null: false
  Integer :duration_ms, null: false
  String :trigger, null: false
  Integer :soil_before
  Integer :soil_after
  String :result, null: false
  String :created_at, null: false
end

WATER_ML_PER_SEC = 6
MAX_WATER_ML_PER_DAY = 100

WATERING_RANGES = {
  'soil_trigger' => 0..100,
  'pump_ms' => 500..10000,
  'min_interval_min' => 1..1440,
  'soak_s' => 10..600,
  'min_rise' => 1..50
}

THRESHOLD_KEYS =%w[soil_min soil_max temp_min temp_max hum_min hum_max light_min light_max]

DEFAULT_THRESHOLDS = {
  'soil_min' => 30, 'soil_max' => 70,
  'temp_min' => 18, 'temp_max' => 28,
  'hum_min' => 40, 'hum_max' => 70,
  'light_min' => 500, 'light_max' => 5000
}

# POST/PUT bez Content-Length (np. curl -X POST bez -d): WEBrick rzuca wyjatek przy czytaniu body
error WEBrick::HTTPStatus::LengthRequired do
  content_type :json
  status 400
  { error: 'empty body (missing Content-Length)' }.to_json
end

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
  WATERING_RANGES.each do |key, range|
    next unless data.key?(key)
    error!(400, "out of range: #{key} (#{range.min}-#{range.max})") unless data[key].is_a?(Integer) && range.include?(data[key])
    fields[key.to_sym] = data[key]
  end
  if data.key?('auto_watering')
    error!(400, 'invalid field: auto_watering') unless [true, false].include?(data['auto_watering'])
    fields[:auto_watering] = data['auto_watering']
  end
  fields
end

def water_left_ml(plant_id)
  since = (Time.now.utc - 24 * 3600).iso8601
  used_ms = DB[:waterings].where(plant_id: plant_id).where { started_at >= since }.sum(:duration_ms) || 0
  [MAX_WATER_ML_PER_DAY - used_ms * WATER_ML_PER_SEC / 1000.0, 0].max.floor
end

def device_config(plant, water_now)
  wait_s = 0
  last = DB[:waterings].where(plant_id: plant[:id]).order(Sequel.desc(:started_at)).first
  if last
    next_time = Time.iso8601(last[:started_at]) + plant[:min_interval_min] * 60
    wait_s = [(next_time - Time.now).ceil, 0].max
  end
  {
    auto_watering: plant[:auto_watering],
    soil_trigger: plant[:soil_trigger],
    pump_ms: plant[:pump_ms],
    min_interval_s: plant[:min_interval_min] * 60,
    soak_s: plant[:soak_s],
    min_rise: plant[:min_rise],
    blocked: plant[:blocked],
    water_now: water_now,
    wait_s: wait_s,
    water_left_ml: water_left_ml(plant[:id])
  }
end

def validate_measurement(data)
  required_fields = %w[measured_at soil_moisture air_temp_c air_humidity light_lux]
  required_fields.each do |field|
    unless data.key?(field)
      return { error: "missing field: #{field}" }
    end
  end

  if data.key?('device_id')
    return { error: 'invalid field: device_id' } unless data['device_id'].is_a?(String) && !data['device_id'].empty?
  elsif !data.key?('plant_id')
    return { error: 'missing field: plant_id or device_id' }
  elsif !(data['plant_id'].is_a?(Integer) && data['plant_id'] > 0)
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
  data = json_body
  fields = plant_fields(data, plant)
  if data.key?('device_id')
    device_id = data['device_id']
    error!(400, 'invalid field: device_id') unless device_id.nil? || (device_id.is_a?(String) && device_id.length.between?(1, 50))
    fields[:device_id] = device_id
    DB[:plants].exclude(id: plant[:id]).where(device_id: device_id).update(device_id: nil) if device_id
  end
  DB[:plants].where(id: plant[:id]).update(fields)
  DB[:plants].where(id: plant[:id]).first.to_json
end

delete '/api/plants/:id' do
  plant = find_plant(params['id'])
  DB.transaction do
    DB[:measurements].where(plant_id: plant[:id]).delete
    DB[:waterings].where(plant_id: plant[:id]).delete
    DB[:plants].where(id: plant[:id]).delete
  end
  { status: 'ok' }.to_json
end

delete '/api/plants/:id/measurements' do
  plant = find_plant(params['id'])
  deleted = DB[:measurements].where(plant_id: plant[:id]).delete
  { status: 'ok', deleted: deleted }.to_json
end

post '/api/plants/:id/water' do
  plant = find_plant(params['id'])
  error!(409, 'plant has no sensor') unless plant[:device_id]
  error!(409, "watering blocked: #{plant[:block_reason]}") if plant[:blocked]
  error!(409, 'daily water limit reached') if water_left_ml(plant[:id]) < 10
  DB[:plants].where(id: plant[:id]).update(water_now: true)
  status 202
  { status: 'queued' }.to_json
end

post '/api/plants/:id/unblock' do
  plant = find_plant(params['id'])
  DB[:plants].where(id: plant[:id]).update(blocked: false, block_reason: nil)
  DB[:plants].where(id: plant[:id]).first.to_json
end

get '/api/plants/:id/waterings' do
  plant = find_plant(params['id'])
  waterings = DB[:waterings].where(plant_id: plant[:id]).order(Sequel.desc(:started_at)).limit(20).all
  { waterings: waterings, water_left_ml: water_left_ml(plant[:id]) }.to_json
end

STAT_COLUMNS = { 'soil' => 'soil_moisture', 'temp' => 'air_temp_c', 'hum' => 'air_humidity', 'light' => 'light_lux' }

# hours: srednie godzinowe gleby [{hour:, soil:}]; wzrosty (podlanie) i dziury w danych pomijamy
def drying_rate(hours)
  drops = []
  hours.each_cons(2) do |a, b|
    next unless Time.iso8601("#{b[:hour]}:00:00Z") - Time.iso8601("#{a[:hour]}:00:00Z") == 3600
    drops << a[:soil] - b[:soil] if b[:soil] < a[:soil]
  end
  drops.empty? ? nil : (drops.sum / drops.size).round(2)
end

get '/api/plants/:id/stats' do
  plant = find_plant(params['id'])
  days = (params['days'] || 7).to_i
  error!(400, 'days must be 1, 7 or 30') unless [1, 7, 30].include?(days)
  since = (Time.now.utc - days * 24 * 3600).iso8601
  where = 'WHERE plant_id = ? AND measured_at >= ?'

  parts = ['COUNT(*) AS count', 'MIN(measured_at) AS first', 'MAX(measured_at) AS last']
  STAT_COLUMNS.each do |key, col|
    parts << "MIN(#{col}) AS #{key}_min, MAX(#{col}) AS #{key}_max, AVG(#{col}) AS #{key}_avg"
    parts << "SUM(#{col} BETWEEN #{plant[:"#{key}_min"].to_f} AND #{plant[:"#{key}_max"].to_f}) AS #{key}_in"
  end
  row = DB.fetch("SELECT #{parts.join(', ')} FROM measurements #{where}", plant[:id], since).first

  summary = { count: row[:count], from: row[:first], to: row[:last] }
  in_range = {}
  STAT_COLUMNS.each_key do |key|
    avg = row[:"#{key}_avg"]
    summary[key] = { min: row[:"#{key}_min"], max: row[:"#{key}_max"], avg: avg && avg.round(1) }
    in_range[key] = row[:count] > 0 ? (row[:"#{key}_in"] * 100.0 / row[:count]).round(1) : nil
  end

  hours = DB.fetch("SELECT substr(measured_at, 1, 13) AS hour, AVG(soil_moisture) AS soil FROM measurements #{where} GROUP BY hour ORDER BY hour", plant[:id], since).all
  hours_by_day = hours.group_by { |h| h[:hour][0, 10] }
  watering_days = DB.fetch("SELECT substr(started_at, 1, 10) AS date, COUNT(*) AS count, SUM(duration_ms) AS ms FROM waterings WHERE plant_id = ? AND started_at >= ? GROUP BY date", plant[:id], since).as_hash(:date)

  daily = DB.fetch("SELECT substr(measured_at, 1, 10) AS date, AVG(air_temp_c) AS avg_temp, AVG(air_humidity) AS avg_hum, AVG(light_lux) AS avg_light FROM measurements #{where} GROUP BY date ORDER BY date", plant[:id], since).map do |d|
    day_hours = hours_by_day[d[:date]]
    w = watering_days[d[:date]]
    {
      date: d[:date],
      avg_temp: d[:avg_temp].round(1),
      avg_hum: d[:avg_hum].round(1),
      avg_light: d[:avg_light].round,
      soil_start: day_hours.first[:soil].round(1),
      soil_end: day_hours.last[:soil].round(1),
      drying_rate: drying_rate(day_hours),
      waterings: w ? w[:count] : 0,
      water_ml: w ? (w[:ms] * WATER_ML_PER_SEC / 1000.0).round : 0
    }
  end

  w = DB.fetch("SELECT COUNT(*) AS count, SUM(result = 'ok') AS ok, SUM(result = 'no_effect') AS no_effect, SUM(result = 'aborted') AS aborted, SUM(duration_ms) AS ms FROM waterings WHERE plant_id = ? AND started_at >= ?", plant[:id], since).first

  {
    days: days,
    summary: summary,
    in_range_pct: in_range,
    drying_rate: drying_rate(hours),
    daily: daily,
    waterings: { count: w[:count], ok: w[:ok].to_i, no_effect: w[:no_effect].to_i, aborted: w[:aborted].to_i, total_ml: (w[:ms].to_i * WATER_ML_PER_SEC / 1000.0).round }
  }.to_json
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

  if data['device_id']
    plant = DB[:plants].where(device_id: data['device_id']).first
    error!(404, 'device not paired') unless plant
  else
    plant = DB[:plants].where(id: data['plant_id']).first
    error!(404, 'unknown plant') unless plant
  end

  id = DB[:measurements].insert(
    plant_id: plant[:id],
    measured_at: data['measured_at'],
    soil_moisture: data['soil_moisture'],
    air_temp_c: data['air_temp_c'],
    air_humidity: data['air_humidity'],
    light_lux: data['light_lux'],
    created_at: now
  )

  water_now = data['device_id'] && plant[:water_now] ? true : false
  DB[:plants].where(id: plant[:id]).update(water_now: false) if water_now

  status 201
  DB[:measurements].where(id: id).first.merge(device: device_config(plant, water_now)).to_json
end

post '/api/waterings' do
  data = json_body
  plant = DB[:plants].where(device_id: data['device_id'].to_s).first
  error!(404, 'device not paired') unless plant
  begin
    Time.iso8601(data['started_at'].to_s)
  rescue ArgumentError
    error!(400, 'invalid field: started_at')
  end
  error!(400, 'invalid field: duration_ms') unless data['duration_ms'].is_a?(Integer) && data['duration_ms'].between?(0, 60000)
  error!(400, 'invalid field: trigger') unless %w[auto manual].include?(data['trigger'])
  error!(400, 'invalid field: result') unless %w[ok no_effect aborted].include?(data['result'])

  id = DB[:waterings].insert(
    plant_id: plant[:id],
    started_at: data['started_at'],
    duration_ms: data['duration_ms'],
    trigger: data['trigger'],
    soil_before: data['soil_before'],
    soil_after: data['soil_after'],
    result: data['result'],
    created_at: now
  )
  if data['result'] == 'no_effect'
    reason = "No soil moisture increase after watering (#{data['soil_before']}% -> #{data['soil_after']}%)"
    DB[:plants].where(id: plant[:id]).update(blocked: true, block_reason: reason)
  end

  status 201
  DB[:waterings].where(id: id).first.merge(blocked: DB[:plants].where(id: plant[:id]).get(:blocked)).to_json
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
