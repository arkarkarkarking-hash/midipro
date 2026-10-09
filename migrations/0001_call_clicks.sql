CREATE TABLE call_clicks (
  day TEXT NOT NULL,
  path TEXT NOT NULL,
  ref_host TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, path, ref_host)
);
