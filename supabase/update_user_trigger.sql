-- Create or replace the trigger function to capture ALL profile details from metadata
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (
    id,
    full_name,
    college_email,
    role,
    roll_number,
    school,
    department,
    program,
    year_of_study,
    admission_year,
    expected_passout_year,
    phone,
    gender
  )
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email,
    'user',
    new.raw_user_meta_data->>'roll_number',
    new.raw_user_meta_data->>'school',
    new.raw_user_meta_data->>'department',
    new.raw_user_meta_data->>'program',
    new.raw_user_meta_data->>'year_of_study',
    new.raw_user_meta_data->>'admission_year',
    new.raw_user_meta_data->>'expected_passout_year',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'gender'
  );
  return new;
end;
$$ language plpgsql security definer;
