require 'net/http'
require 'json'
require 'uri'

module Http
  def self.post_measurement(payload, config)
    uri = URI("#{config[:backend_url]}/api/measurements")
    http = Net::HTTP.new(uri.host, uri.port)
    http.read_timeout = 3
    http.open_timeout = 3
    
    request = Net::HTTP::Post.new(uri.path)
    request['Content-Type'] = 'application/json'
    request.body = payload.to_json
    
    response = http.request(request)
    
    if response.code.to_i >= 200 && response.code.to_i < 300
      { ok: true, status: response.code }
    else
      { ok: false, status: response.code, error: response.body }
    end
  rescue => e
    { ok: false, error: e.message }
  end
end
