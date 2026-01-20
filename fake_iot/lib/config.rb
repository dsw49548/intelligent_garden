module Config
  def self.load(env = ENV)
    {
      backend_url: env.fetch('BACKEND_URL', 'http://localhost:4567'),
      plant_id: env.fetch('PLANT_ID', '1').to_i,
      interval_seconds: env.fetch('INTERVAL_SECONDS', '5').to_i,
      mode: env.fetch('MODE', 'send'),
      scenario: env.fetch('SCENARIO', 'stable'),
      seed: env.fetch('SEED', '123').to_i
    }
  end
end
