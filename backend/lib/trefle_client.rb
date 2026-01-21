require 'open3'
require 'json'
require 'cgi'

module TrefleClient
  BASE_URL = 'https://trefle.io/api/v1'

  def self.fetch(path, token)
    unless token && !token.empty?
      return { error: 'TREFLE_TOKEN is missing' }
    end

    separator = path.include?('?') ? '&' : '?'
    encoded_token = CGI.escape(token)
    url = "#{BASE_URL}#{path}#{separator}token=#{encoded_token}"

    stdout, stderr, status = Open3.capture3(
      'curl',
      '-sS',
      '--fail',
      '--compressed',
      url
    )

    unless status.success?
      puts "Trefle curl error: #{stderr}" unless stderr.empty?
      return nil
    end

    begin
      JSON.parse(stdout)
    rescue JSON::ParserError => e
      puts "Trefle JSON parse error: #{e.message}"
      nil
    end
  end
end
