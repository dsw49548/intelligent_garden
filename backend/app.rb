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

get '/health' do
  content_type :json
  { status: 'ok' }.to_json
end
