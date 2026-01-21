require 'sinatra'
require 'json'
require 'sequel'
require 'time'
require 'rack/cors'
require 'dotenv/load'
require 'cgi'
require_relative 'lib/trefle_client'

use Rack::Cors do
  allow do
    origins 'http://localhost:5173'
    resource '/api/*', headers: 'Content-Type', methods: [:get, :post, :options]
  end
end

set :bind, '0.0.0.0'
set :port, 4567
set :server, "webrick"

DB_PATH = File.expand_path(File.join(__dir__, "db.sqlite3"))
DB = Sequel.connect("sqlite://#{DB_PATH}")

begin
  DB.run("PRAGMA journal_mode=WAL")
rescue => e
  puts "#{e.class} #{e.message}"
  exit 1
end

if !DB.table_exists?(:measurements)
  DB.create_table :measurements do
    primary_key :id
    Integer :plant_id, null: false
    String :measured_at, null: false
    Integer :soil_moisture, null: false
    Real :air_temp_c, null: false
    Real :air_humidity, null: false
    Integer :light_lux, null: false
    String :created_at, null: false
  end
end

begin
  DB[:measurements].insert(
    plant_id: 0,
    measured_at: Time.now.utc.iso8601,
    soil_moisture: 0,
    air_temp_c: 0.0,
    air_humidity: 0.0,
    light_lux: 0,
    created_at: Time.now.utc.iso8601
  )
rescue Sequel::UniqueConstraintViolation
rescue => e
  puts "#{e.class} #{e.message}"
  exit 1
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

def check_trefle_token
  unless TREFLE_TOKEN && !TREFLE_TOKEN.empty?
    status 500
    return { error: 'TREFLE_TOKEN is missing' }.to_json
  end
  nil
end

def fetch_trefle(path)
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

def map_recommendations(trefle_data)
  return get_default_recommendations unless trefle_data
  
  data = trefle_data.is_a?(Hash) ? trefle_data : trefle_data['data']
  return get_default_recommendations unless data
  
  light = data['light'] || 0
  temp_min = data['temperature_minimum'] || data['temperature_min'] || 18
  temp_max = data['temperature_maximum'] || data['temperature_max'] || 28
  
  {
    soil_moisture_min: 30,
    soil_moisture_max: 70,
    air_temp_c_min: temp_min.to_f,
    air_temp_c_max: temp_max.to_f,
    air_humidity_min: 40,
    air_humidity_max: 70,
    light_lux_min: light > 0 ? (light * 100).to_i : 500,
    light_lux_max: light > 0 ? (light * 1000).to_i : 5000
  }
end

def get_default_recommendations
  {
    soil_moisture_min: 30,
    soil_moisture_max: 70,
    air_temp_c_min: 18,
    air_temp_c_max: 28,
    air_humidity_min: 40,
    air_humidity_max: 70,
    light_lux_min: 500,
    light_lux_max: 5000
  }
end

get '/health' do
  content_type :json
  { status: 'ok' }.to_json
end

get '/api/plants/ping' do
  content_type :json
  
  error = check_trefle_token
  return error if error
  
  result = fetch_trefle("/plants/search?q=test")
  if result
    { ok: true }.to_json
  else
    status 500
    { ok: false, error: 'Trefle unreachable' }.to_json
  end
end

get '/api/plants/search' do
  content_type :json
  
  error = check_trefle_token
  return error if error
  
  query = params['q']
  unless query && query.length >= 2
    status 400
    return { error: 'query too short (min 2 chars)' }.to_json
  end
  
  result = fetch_trefle("/plants/search?q=#{CGI.escape(query)}")
  
  if result && result['data']
    plants = result['data'].first(15).map do |plant|
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
    { data: plants }.to_json
  else
    status 404
    { error: 'not found' }.to_json
  end
end

get '/api/plants/:id' do
  content_type :json
  
  error = check_trefle_token
  return error if error
  
  trefle_id = params['id']
  result = fetch_trefle("/plants/#{trefle_id}")
  
  if result
    mapped = map_plant_details(result)
    if mapped
      mapped.to_json
    else
      status 404
      { error: 'not found' }.to_json
    end
  else
    status 404
    { error: 'not found' }.to_json
  end
end

get '/api/plants/:id/recommendations' do
  content_type :json
  
  trefle_id = params['id']
  result = fetch_trefle("/plants/#{trefle_id}")
  
  if result
    recommendations = map_recommendations(result)
    { recommendations: recommendations }.to_json
  else
    status 404
    { error: 'not found' }.to_json
  end
end

post '/api/measurements' do
  content_type :json
  
  begin
    data = JSON.parse(request.body.read)
  rescue JSON::ParserError
    status 400
    return { error: 'invalid JSON' }.to_json
  end

  validation_error = validate_measurement(data)
  if validation_error
    status 400
    return validation_error.to_json
  end

  created_at = Time.now.utc.iso8601
  id = DB[:measurements].insert(
    plant_id: data['plant_id'],
    measured_at: data['measured_at'],
    soil_moisture: data['soil_moisture'],
    air_temp_c: data['air_temp_c'],
    air_humidity: data['air_humidity'],
    light_lux: data['light_lux'],
    created_at: created_at
  )

  record = DB[:measurements].where(id: id).first
  status 201
  {
    id: record[:id],
    plant_id: record[:plant_id],
    measured_at: record[:measured_at],
    soil_moisture: record[:soil_moisture],
    air_temp_c: record[:air_temp_c],
    air_humidity: record[:air_humidity],
    light_lux: record[:light_lux],
    created_at: record[:created_at]
  }.to_json
end

get '/api/measurements/latest' do
  content_type :json
  
  plant_id = params['plant_id']
  unless plant_id && plant_id.to_i > 0
    status 400
    return { error: 'missing or invalid plant_id' }.to_json
  end

  record = DB[:measurements]
    .where(plant_id: plant_id.to_i)
    .order(Sequel.desc(:measured_at))
    .limit(1)
    .first

  if record.nil?
    status 404
    return { error: 'not found' }.to_json
  end

  {
    id: record[:id],
    plant_id: record[:plant_id],
    measured_at: record[:measured_at],
    soil_moisture: record[:soil_moisture],
    air_temp_c: record[:air_temp_c],
    air_humidity: record[:air_humidity],
    light_lux: record[:light_lux],
    created_at: record[:created_at]
  }.to_json
end

get '/api/measurements' do
  content_type :json
  
  plant_id = params['plant_id']
  unless plant_id && plant_id.to_i > 0
    status 400
    return { error: 'missing or invalid plant_id' }.to_json
  end

  limit = params['limit'] ? params['limit'].to_i : 100
  if limit < 1 || limit > 500
    status 400
    return { error: 'limit out of range (1-500)' }.to_json
  end

  records = DB[:measurements]
    .where(plant_id: plant_id.to_i)
    .order(Sequel.desc(:measured_at))
    .limit(limit)
    .map do |record|
      {
        id: record[:id],
        plant_id: record[:plant_id],
        measured_at: record[:measured_at],
        soil_moisture: record[:soil_moisture],
        air_temp_c: record[:air_temp_c],
        air_humidity: record[:air_humidity],
        light_lux: record[:light_lux],
        created_at: record[:created_at]
      }
    end

  records.to_json
end
