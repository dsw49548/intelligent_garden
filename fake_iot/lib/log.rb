module Log
  def self.line(config, payload, result)
    timestamp = Time.now.strftime('%Y-%m-%d %H:%M:%S')
    
    if config[:mode] == 'dry'
      puts "#{config[:mode]} | #{config[:scenario]} | #{timestamp} | #{payload.to_json} | ok"
    else
      if result[:ok]
        puts "#{config[:mode]} | #{config[:scenario]} | #{timestamp} | soil:#{payload[:soil_moisture]} temp:#{payload[:air_temp_c]} | ok"
      else
        error_msg = result[:error] || "HTTP #{result[:status]}"
        puts "#{config[:mode]} | #{config[:scenario]} | #{timestamp} | soil:#{payload[:soil_moisture]} temp:#{payload[:air_temp_c]} | error: #{error_msg}"
      end
    end
  end
end
