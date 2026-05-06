-- Alert configuration columns for work schedules
-- break_alert: fires after N minutes of continuous activity (default 90 min = ultradian rhythm)
-- end_of_day_alert: fires at end_time + offset (offset 0 = exactly at end_time)
alter table work_schedules
  add column if not exists break_alert_enabled boolean not null default true,
  add column if not exists break_alert_interval_minutes integer not null default 90
    check (break_alert_interval_minutes between 30 and 480),
  add column if not exists break_alert_message text not null default 'Llevas mucho tiempo conectado delante de tu PC, por favor toma un descanso de unos minutos.',
  add column if not exists end_of_day_alert_enabled boolean not null default true,
  add column if not exists end_of_day_alert_offset_minutes integer not null default 0
    check (end_of_day_alert_offset_minutes between -60 and 0),
  add column if not exists end_of_day_alert_message text not null default 'Has llegado al fin de tu jornada laboral. Recuerda que hasta tu siguiente día laboral no estás en la obligación de atender asuntos profesionales.';

comment on column work_schedules.break_alert_interval_minutes is
  'Minutes of continuous activity before showing a break alert. Default 90 min (ultradian rhythm). Min 30, max 480.';
comment on column work_schedules.end_of_day_alert_offset_minutes is
  'Minutes relative to end_time when the end-of-day alert fires. 0 = at end_time, -15 = 15 min before end_time.';
