require 'time'

module Payload
  def self.build(state, config)
    {
      plant_id: config[:plant_id],
      measured_at: Time.now.utc.iso8601,
      soil_moisture: clamp(state[:soil_moisture], 0, 100),
      air_temp_c: state[:air_temp_c],
      air_humidity: clamp(state[:air_humidity], 0, 100),
      light_lux: [state[:light_lux], 0].max
    }
  end

  def self.clamp(value, min, max)
    [[value, min].max, max].min
  end
end
