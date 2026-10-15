-- Crear la tabla de mensajes
create table messages (
  id uuid default gen_random_uuid() primary key,
  content text not null,
  user_id uuid references auth.users(id) not null,
  user_email text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar Row Level Security (RLS)
alter table messages enable row level security;

-- Política 1: Cualquiera (anónimo o autenticado) puede leer los mensajes
create policy "Lectura pública de mensajes" 
  on messages for select 
  using (true);

-- Política 2: Solo usuarios autenticados pueden insertar mensajes propios
create policy "Creación de mensajes para usuarios autenticados" 
  on messages for insert 
  with check (auth.uid() = user_id);

-- Política 3: Solo el autor puede actualizar su propio mensaje
create policy "Actualización exclusiva del autor" 
  on messages for update 
  using (auth.uid() = user_id);

-- Política 4: Solo el autor puede eliminar su propio mensaje
create policy "Eliminación exclusiva del autor" 
  on messages for delete 
  using (auth.uid() = user_id);