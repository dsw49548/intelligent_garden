require_relative 'lib/config'
require_relative 'lib/scenarios'
require_relative 'lib/payload'
require_relative 'lib/http'
require_relative 'lib/log'
require 'json'

config = Config.load
state = Scenarios.init(config[:scenario], config[:seed])

loop do
  state = Scenarios.step(config[:scenario], state, config)
  payload = Payload.build(state, config)
  
  if config[:mode] == 'dry'
    result = { ok: true }
  else
    result = Http.post_measurement(payload, config)
  end
  
  Log.line(config, payload, result)
  sleep(config[:interval_seconds])
end
