require 'sinatra'
require 'json'
require 'sequel'
require 'time'

set :bind, '0.0.0.0'
set :port, 4567

DB = Sequel.sqlite('db.sqlite3')

unless DB.table_exists?(:measurements)
  migration = File.read('db/migrate/001_create_measurements.rb')
  eval(migration)
  Sequel::Migrator.run(DB, 'db/migrate')
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

get '/health' do
  content_type :json
  { status: 'ok' }.to_json
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
