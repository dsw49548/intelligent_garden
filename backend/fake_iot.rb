require 'net/http'
require 'json'
require 'time'

state = {
  base_url: "http://localhost:4567",
  plants: [1],
  mode: "stable",
  interval: 2.0,
  sending: false,
  thread: nil,
  plant_state: {}
}

def generate_measurement(plant_id, mode, plant_state)
  tick = (plant_state[plant_id] || {})[:tick] || 0
  state = plant_state[plant_id] || {}
  
  case mode
  when "stable"
    measurement = {
      plant_id: plant_id,
      measured_at: Time.now.utc.iso8601,
      soil_moisture: 40 + rand(20),
      air_temp_c: 20.0 + rand(4.0),
      air_humidity: 40 + rand(20),
      light_lux: 800 + rand(700)
    }
  when "daynight"
    cycle = (tick * 0.1) % (2 * Math::PI)
    light = (Math.sin(cycle) * 25000 + 25000).to_i
    temp = 20.0 + Math.sin(cycle) * 3.0
    humidity = 50.0 - Math.sin(cycle) * 10.0
    measurement = {
      plant_id: plant_id,
      measured_at: Time.now.utc.iso8601,
      soil_moisture: 40 + rand(20),
      air_temp_c: temp.round(1),
      air_humidity: humidity.round(1),
      light_lux: light
    }
  when "dryout"
    base_soil = state[:soil_moisture] || 100.0
    new_soil = [base_soil - 1.5, 10.0].max
    measurement = {
      plant_id: plant_id,
      measured_at: Time.now.utc.iso8601,
      soil_moisture: new_soil.to_i,
      air_temp_c: 22.0 + rand(2.0),
      air_humidity: 45 + rand(10),
      light_lux: 1000 + rand(500)
    }
    state[:soil_moisture] = new_soil
  when "randomwalk"
    prev = state.dup
    soil = (prev[:soil_moisture] || 50) + rand(-3..3)
    soil = [[soil, 0].max, 100].min
    temp = (prev[:air_temp_c] || 22.0) + rand(-0.5..0.5)
    temp = [[temp, 10.0].max, 35.0].min
    humidity = (prev[:air_humidity] || 50.0) + rand(-2..2)
    humidity = [[humidity, 20.0].max, 90.0].min
    light = (prev[:light_lux] || 1500) + rand(-200..200)
    light = [light, 0].max
    measurement = {
      plant_id: plant_id,
      measured_at: Time.now.utc.iso8601,
      soil_moisture: soil.to_i,
      air_temp_c: temp.round(1),
      air_humidity: humidity.round(1),
      light_lux: light
    }
    state[:soil_moisture] = soil
    state[:air_temp_c] = temp
    state[:air_humidity] = humidity
    state[:light_lux] = light
  else
    measurement = {
      plant_id: plant_id,
      measured_at: Time.now.utc.iso8601,
      soil_moisture: 50,
      air_temp_c: 22.0,
      air_humidity: 50.0,
      light_lux: 1500
    }
  end
  
  state[:tick] = tick + 1
  plant_state[plant_id] = state
  measurement
end

def send_measurement(url, measurement)
  uri = URI(url)
  http = Net::HTTP.new(uri.host, uri.port)
  http.read_timeout = 3
  http.open_timeout = 3
  
  request = Net::HTTP::Post.new(uri.path)
  request['Content-Type'] = 'application/json'
  request.body = measurement.to_json
  
  response = http.request(request)
  
  if response.code.to_i == 201
    data = JSON.parse(response.body)
    "OK plant=#{measurement[:plant_id]} id=#{data['id']}"
  else
    body_snippet = response.body[0..50]
    "ERR plant=#{measurement[:plant_id]} #{response.code} #{body_snippet}"
  end
rescue => e
  if e.message.include?("Connection refused") || e.message.include?("connect")
    "ERR connection"
  else
    "ERR #{e.message[0..30]}"
  end
end

def print_status(state)
  puts ""
  puts "Status:"
  puts "  URL: #{state[:base_url]}"
  puts "  Plants: #{state[:plants].empty? ? '(none)' : state[:plants].join(', ')}"
  puts "  Mode: #{state[:mode]}"
  puts "  Interval: #{state[:interval]}s"
  puts "  Running: #{state[:sending]}"
  puts ""
end

def print_help
  puts "Commands:"
  puts "  help          - Show this help"
  puts "  status        - Show current state"
  puts "  start         - Start continuous sending"
  puts "  stop          - Stop continuous sending"
  puts "  once          - Send one measurement for all plants"
  puts "  port <PORT>   - Set base URL to http://localhost:<PORT>"
  puts "  url <URL>     - Set base URL to <URL>"
  puts "  interval <S>  - Set interval (0.2-3600 seconds)"
  puts "  mode <NAME>   - Set mode (stable, daynight, dryout, randomwalk)"
  puts "  plants        - Show plant IDs"
  puts "  add <ID>      - Add plant ID"
  puts "  rm <ID>       - Remove plant ID"
  puts "  set <ID,...>  - Set plant IDs (comma-separated)"
  puts "  clear         - Clear plant list"
  puts "  quit/exit     - Stop and exit"
end

def run_once(state)
  state[:plants].each do |plant_id|
    measurement = generate_measurement(plant_id, state[:mode], state[:plant_state])
    url = "#{state[:base_url]}/api/measurements"
    result = send_measurement(url, measurement)
    timestamp = Time.now.strftime("%H:%M:%S")
    puts "[#{timestamp}] #{result}"
  end
end

def run_loop(state)
  while state[:sending]
    run_once(state)
    sleep(state[:interval])
  end
end

def handle_command(cmd, state)
  parts = cmd.strip.split(/\s+/, 2)
  action = parts[0].downcase
  arg = parts[1]
  
  case action
  when "help"
    print_help
  when "status"
    print_status(state)
  when "start"
    if state[:sending]
      puts "already running"
    else
      state[:sending] = true
      state[:thread] = Thread.new { run_loop(state) }
      puts "started"
      print_status(state)
    end
  when "stop"
    if state[:sending]
      state[:sending] = false
      if state[:thread]
        state[:thread].join(1)
        state[:thread] = nil
      end
      puts "stopped"
      print_status(state)
    else
      puts "not running"
    end
  when "once"
    run_once(state)
  when "port"
    if arg && arg.match(/^\d+$/)
      state[:base_url] = "http://localhost:#{arg}"
      puts "URL set to #{state[:base_url]}"
      print_status(state)
    else
      puts "invalid port"
    end
  when "url"
    if arg && arg.match(/^https?:\/\//)
      state[:base_url] = arg
      puts "URL set to #{state[:base_url]}"
      print_status(state)
    else
      puts "invalid URL"
    end
  when "interval"
    if arg
      val = arg.to_f
      if val >= 0.2 && val <= 3600
        state[:interval] = val
        puts "interval set to #{val}s"
        print_status(state)
      else
        puts "interval must be between 0.2 and 3600"
      end
    else
      puts "missing interval value"
    end
  when "mode"
    if arg
      mode = arg.downcase
      if %w[stable daynight dryout randomwalk].include?(mode)
        state[:mode] = mode
        state[:plant_state] = {}
        puts "mode set to #{mode}"
        print_status(state)
      else
        puts "unknown mode: #{mode}"
      end
    else
      puts "missing mode name"
    end
  when "plants"
    if state[:plants].empty?
      puts "no plants"
    else
      puts state[:plants].join(', ')
    end
  when "add"
    if arg && arg.match(/^\d+$/)
      id = arg.to_i
      unless state[:plants].include?(id)
        state[:plants] << id
        puts "added plant #{id}"
        print_status(state)
      else
        puts "plant #{id} already exists"
      end
    else
      puts "invalid plant ID"
    end
  when "rm"
    if arg && arg.match(/^\d+$/)
      id = arg.to_i
      if state[:plants].include?(id)
        state[:plants].delete(id)
        state[:plant_state].delete(id)
        puts "removed plant #{id}"
        print_status(state)
      else
        puts "not found"
      end
    else
      puts "invalid plant ID"
    end
  when "set"
    if arg
      ids = arg.split(',').map(&:strip).select { |s| s.match(/^\d+$/) }.map(&:to_i).uniq
      if ids.empty?
        puts "no valid plant IDs"
      else
        state[:plants] = ids
        state[:plant_state].delete_if { |k, v| !ids.include?(k) }
        puts "plants set to: #{ids.join(', ')}"
        print_status(state)
      end
    else
      puts "missing plant IDs"
    end
  when "clear"
    if state[:plants].empty?
      puts "already empty"
    else
      state[:plants] = []
      state[:plant_state] = {}
      puts "cleared"
      print_status(state)
    end
  when "quit", "exit"
    if state[:sending]
      state[:sending] = false
      if state[:thread]
        state[:thread].join(1)
        state[:thread] = nil
      end
    end
    puts "bye"
    return false
  else
    puts "unknown command: #{action}"
  end
  
  true
end

puts "=== Fake IoT Generator ==="
puts "Type 'help' for commands"
print_status(state)

loop do
  print "> "
  cmd = gets
  break unless cmd
  
  continue = handle_command(cmd, state)
  break unless continue
end
