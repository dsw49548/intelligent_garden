require_relative 'app'

DEMO_NAME = 'Demo plant (simulated data)'
PUMP_MS = 3000

username = ARGV[0] or abort 'Usage: bundle exec ruby seed_demo.rb <username>'
user = DB[:users].where(username: username).first or abort "No user: #{username}"

rng = Random.new(42)
end_time = Time.at(Time.now.to_i / 600 * 600).utc
t = end_time - 7 * 24 * 3600
soil = 70.0
sun_by_day = {}
measurements = []
waterings = []

while t <= end_time
  local = t.getlocal
  sun = sun_by_day[local.yday] ||= 0.25 + rng.rand * 0.75     # 0.25 cloudy .. 1.0 sunny
  hour = local.hour + local.min / 60.0
  daylight = [Math.sin((hour - 6) / 12.0 * Math::PI), 0].max   # day from 6:00 to 18:00

  light = (daylight * sun * 5000 + rng.rand * 5).round
  temp = 19 + 6 * daylight * sun + rng.rand * 2
  hum = (65 - (temp - 19) * 3 + rng.rand * 2 - 1).clamp(40, 65)

  soil -= 0.05 + light / 5000.0 * 0.5 + (temp - 19) * 0.03
  if soil < 30
    waterings << { started_at: t.iso8601, duration_ms: PUMP_MS, trigger: 'auto', soil_before: soil.round,
                   soil_after: (soil + 35).round, result: 'ok', created_at: t.iso8601 }
    soil += 35
  end

  measurements << { measured_at: t.iso8601, soil_moisture: soil.round, air_temp_c: temp.round(1),
                    air_humidity: hum.round(1), light_lux: light, created_at: t.iso8601 }
  t += 600
end

DB.transaction do
  old_ids = DB[:plants].where(user_id: user[:id], name: DEMO_NAME).select_map(:id)
  DB[:measurements].where(plant_id: old_ids).delete
  DB[:waterings].where(plant_id: old_ids).delete
  DB[:plants].where(id: old_ids).delete

  thresholds = DEFAULT_THRESHOLDS.transform_keys(&:to_sym)
  plant_id = DB[:plants].insert(thresholds.merge(user_id: user[:id], name: DEMO_NAME, created_at: Time.now.utc.iso8601))
  DB[:measurements].multi_insert(measurements.map { |m| m.merge(plant_id: plant_id) })
  DB[:waterings].multi_insert(waterings.map { |w| w.merge(plant_id: plant_id) })
  puts "Plant ##{plant_id} '#{DEMO_NAME}' for #{username}: added #{measurements.size} measurements and #{waterings.size} waterings"
end
