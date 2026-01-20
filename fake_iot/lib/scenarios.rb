module Scenarios
  def self.init(name, seed)
    case name
    when 'stable'
      { soil_moisture: 55, air_temp_c: 22.5, air_humidity: 50, light_lux: 1500, tick: 0 }
    when 'drought'
      { soil_moisture: 100, air_temp_c: 22.5, air_humidity: 50, light_lux: 1500, tick: 0 }
    when 'daynight'
      { soil_moisture: 55, air_temp_c: 22.0, air_humidity: 55, light_lux: 0, tick: 0 }
    when 'randomwalk'
      srand(seed)
      { soil_moisture: 50, air_temp_c: 22.0, air_humidity: 50, light_lux: 1500, tick: 0 }
    else
      { soil_moisture: 55, air_temp_c: 22.5, air_humidity: 50, light_lux: 1500, tick: 0 }
    end
  end

  def self.step(name, state, config)
    new_state = state.dup
    new_state[:tick] = (new_state[:tick] || 0) + 1
    
    case name
    when 'stable'
      step_stable(new_state)
    when 'drought'
      step_drought(new_state)
    when 'daynight'
      step_daynight(new_state)
    when 'randomwalk'
      step_randomwalk(new_state)
    else
      step_stable(new_state)
    end
  end

  def self.step_stable(state)
    state[:soil_moisture] = 55 + rand(-2..2)
    state[:air_temp_c] = 22.5 + rand(-0.5..0.5)
    state[:air_humidity] = 50 + rand(-3..3)
    state[:light_lux] = 1500 + rand(-100..100)
    state
  end

  def self.step_drought(state)
    new_moisture = [state[:soil_moisture] - 1, 10].max
    state[:soil_moisture] = new_moisture
    state[:air_temp_c] = 22.5 + rand(-0.5..0.5)
    state[:air_humidity] = 50 + rand(-3..3)
    state[:light_lux] = 1500 + rand(-100..100)
    state
  end

  def self.step_daynight(state)
    tick = state[:tick] || 0
    day = (tick / 3) % 2 == 0
    
    state[:light_lux] = day ? rand(2000..8000) : rand(0..50)
    state[:air_temp_c] = day ? 23.0 + rand(-0.5..0.5) : 21.0 + rand(-0.5..0.5)
    state[:air_humidity] = day ? 48 + rand(-2..2) : 52 + rand(-2..2)
    state[:soil_moisture] = 55 + rand(-2..2)
    state
  end

  def self.step_randomwalk(state)
    state[:soil_moisture] = state[:soil_moisture] + rand(-2..2)
    state[:air_temp_c] = state[:air_temp_c] + rand(-0.3..0.3)
    state[:air_humidity] = state[:air_humidity] + rand(-2..2)
    state[:light_lux] = [state[:light_lux] + rand(-100..100), 0].max
    state
  end
end
