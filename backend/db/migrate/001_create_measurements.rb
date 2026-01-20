Sequel.migration do
  up do
    create_table :measurements do
      primary_key :id
      Integer :plant_id, null: false
      String :measured_at, null: false
      Integer :soil_moisture, null: false
      Real :air_temp_c, null: false
      Real :air_humidity, null: false
      Integer :light_lux, null: false
      String :created_at, null: false
    end
  end

  down do
    drop_table :measurements
  end
end
