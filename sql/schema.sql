CREATE DATABASE IF NOT EXISTS copa_kaleo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE copa_kaleo;

SET FOREIGN_KEY_CHECKS = 0;
DROP VIEW IF EXISTS v_jogos, v_classificacao, v_artilharia, v_ranking_bolao;
DROP TABLE IF EXISTS league_members, leagues, wall_messages, posts, player_stats, checkins, leaderboard, predictions, match_events, matches, users, players, teams, tournaments;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE tournaments (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  season INT NOT NULL,
  edition INT NOT NULL,
  phase VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  event_date VARCHAR(20),
  first_kickoff_at DATETIME(3),
  participant_count INT NOT NULL DEFAULT 0,
  champion_team_id VARCHAR(64),
  revelation_team_id VARCHAR(64)
);

CREATE TABLE teams (
  id VARCHAR(64) PRIMARY KEY,
  tournament_id VARCHAR(64) NOT NULL,
  name VARCHAR(80) NOT NULL,
  short_name VARCHAR(8) NOT NULL,
  slug VARCHAR(80),
  group_name VARCHAR(4),
  primary_color VARCHAR(16),
  secondary_color VARCHAR(16),
  logo_url VARCHAR(500),
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id)
);

CREATE TABLE players (
  id VARCHAR(64) PRIMARY KEY,
  tournament_id VARCHAR(64) NOT NULL,
  team_id VARCHAR(64) NOT NULL,
  name VARCHAR(80) NOT NULL,
  number INT,
  position VARCHAR(4),
  photo_url VARCHAR(500),
  linked_uid VARCHAR(128),
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
  FOREIGN KEY (team_id) REFERENCES teams(id)
);

CREATE TABLE users (
  id VARCHAR(128) PRIMARY KEY,
  display_name VARCHAR(60) NOT NULL,
  photo_url VARCHAR(500),
  is_guest BOOLEAN NOT NULL DEFAULT FALSE,
  favorite_team_id VARCHAR(64),
  created_at DATETIME(3),
  FOREIGN KEY (favorite_team_id) REFERENCES teams(id)
);

CREATE TABLE matches (
  id VARCHAR(64) PRIMARY KEY,
  tournament_id VARCHAR(64) NOT NULL,
  code VARCHAR(10) NOT NULL,
  stage VARCHAR(20) NOT NULL,
  group_name VARCHAR(4),
  order_num INT NOT NULL,
  home_team_id VARCHAR(64),
  away_team_id VARCHAR(64),
  kickoff_at DATETIME(3),
  status VARCHAR(20) NOT NULL,
  period TINYINT,
  home_score INT NOT NULL DEFAULT 0,
  away_score INT NOT NULL DEFAULT 0,
  home_penalties INT,
  away_penalties INT,
  finished_at DATETIME(3),
  mvp_player_id VARCHAR(64),
  mvp_player_name VARCHAR(80),
  crowd_home_pct INT,
  crowd_draw_pct INT,
  crowd_away_pct INT,
  crowd_total INT,
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
  FOREIGN KEY (home_team_id) REFERENCES teams(id),
  FOREIGN KEY (away_team_id) REFERENCES teams(id),
  INDEX idx_matches_order (tournament_id, order_num)
);

CREATE TABLE match_events (
  id VARCHAR(64) PRIMARY KEY,
  match_id VARCHAR(64) NOT NULL,
  type VARCHAR(20) NOT NULL,
  minute INT,
  period TINYINT,
  team_id VARCHAR(64),
  player_id VARCHAR(64),
  player_name VARCHAR(80),
  assist_player_id VARCHAR(64),
  assist_player_name VARCHAR(80),
  text VARCHAR(500),
  voided BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME(3),
  FOREIGN KEY (match_id) REFERENCES matches(id),
  FOREIGN KEY (team_id) REFERENCES teams(id),
  FOREIGN KEY (player_id) REFERENCES players(id)
);

CREATE TABLE predictions (
  id VARCHAR(200) PRIMARY KEY,
  tournament_id VARCHAR(64) NOT NULL,
  match_id VARCHAR(64) NOT NULL,
  uid VARCHAR(128) NOT NULL,
  display_name VARCHAR(60),
  stage VARCHAR(20),
  home INT NOT NULL,
  away INT NOT NULL,
  is_joker BOOLEAN NOT NULL DEFAULT FALSE,
  points INT,
  exact BOOLEAN,
  created_at DATETIME(3),
  updated_at DATETIME(3),
  FOREIGN KEY (match_id) REFERENCES matches(id),
  FOREIGN KEY (uid) REFERENCES users(id),
  INDEX idx_predictions_uid (uid)
);

CREATE TABLE leaderboard (
  id VARCHAR(200) PRIMARY KEY,
  tournament_id VARCHAR(64) NOT NULL,
  uid VARCHAR(128) NOT NULL,
  display_name VARCHAR(60),
  total_points INT NOT NULL DEFAULT 0,
  exact_scores INT NOT NULL DEFAULT 0,
  predictions_count INT NOT NULL DEFAULT 0,
  rank_pos INT,
  best_rank INT,
  updated_at DATETIME(3),
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
  FOREIGN KEY (uid) REFERENCES users(id)
);

CREATE TABLE leagues (
  id VARCHAR(64) PRIMARY KEY,
  tournament_id VARCHAR(64) NOT NULL,
  name VARCHAR(60) NOT NULL,
  invite_code VARCHAR(12),
  owner_uid VARCHAR(128),
  member_count INT NOT NULL DEFAULT 0,
  created_at DATETIME(3),
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
  FOREIGN KEY (owner_uid) REFERENCES users(id)
);

CREATE TABLE league_members (
  league_id VARCHAR(64) NOT NULL,
  uid VARCHAR(128) NOT NULL,
  PRIMARY KEY (league_id, uid),
  FOREIGN KEY (league_id) REFERENCES leagues(id),
  FOREIGN KEY (uid) REFERENCES users(id)
);

CREATE TABLE checkins (
  id VARCHAR(200) PRIMARY KEY,
  tournament_id VARCHAR(64) NOT NULL,
  match_id VARCHAR(64) NOT NULL,
  uid VARCHAR(128) NOT NULL,
  created_at DATETIME(3),
  FOREIGN KEY (match_id) REFERENCES matches(id),
  FOREIGN KEY (uid) REFERENCES users(id)
);

CREATE TABLE player_stats (
  id VARCHAR(200) PRIMARY KEY,
  tournament_id VARCHAR(64) NOT NULL,
  player_id VARCHAR(64) NOT NULL,
  name VARCHAR(80),
  team_id VARCHAR(64),
  team_name VARCHAR(80),
  goals INT NOT NULL DEFAULT 0,
  assists INT NOT NULL DEFAULT 0,
  yellow INT NOT NULL DEFAULT 0,
  red INT NOT NULL DEFAULT 0,
  mvp_count INT NOT NULL DEFAULT 0,
  FOREIGN KEY (player_id) REFERENCES players(id),
  FOREIGN KEY (team_id) REFERENCES teams(id)
);

CREATE TABLE posts (
  id VARCHAR(64) PRIMARY KEY,
  tournament_id VARCHAR(64) NOT NULL,
  title VARCHAR(200) NOT NULL,
  slug VARCHAR(200),
  category VARCHAR(20),
  status VARCHAR(20),
  source VARCHAR(20),
  author_name VARCHAR(60),
  match_id VARCHAR(64),
  excerpt VARCHAR(500),
  content MEDIUMTEXT,
  cover_image_url VARCHAR(500),
  published_at DATETIME(3),
  updated_at DATETIME(3),
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
  FOREIGN KEY (match_id) REFERENCES matches(id)
);

CREATE TABLE wall_messages (
  id VARCHAR(64) PRIMARY KEY,
  tournament_id VARCHAR(64) NOT NULL,
  uid VARCHAR(128),
  display_name VARCHAR(60),
  text VARCHAR(280),
  status VARCHAR(20),
  created_at DATETIME(3),
  FOREIGN KEY (uid) REFERENCES users(id)
);

CREATE VIEW v_jogos AS
SELECT m.order_num AS ordem, m.code AS jogo, m.stage AS fase, m.group_name AS grupo, m.kickoff_at AS horario,
       h.name AS mandante, m.home_score AS gols_mandante, m.away_score AS gols_visitante, a.name AS visitante,
       m.status, m.mvp_player_name AS craque
FROM matches m
LEFT JOIN teams h ON h.id = m.home_team_id
LEFT JOIN teams a ON a.id = m.away_team_id
ORDER BY m.order_num;

CREATE VIEW v_classificacao AS
SELECT t.group_name AS grupo, t.name AS time,
       COUNT(r.match_id) AS jogos,
       SUM(r.gp > r.gc) AS vitorias, SUM(r.gp = r.gc) AS empates, SUM(r.gp < r.gc) AS derrotas,
       COALESCE(SUM(r.gp), 0) AS gols_pro, COALESCE(SUM(r.gc), 0) AS gols_contra,
       COALESCE(SUM(r.gp) - SUM(r.gc), 0) AS saldo,
       COALESCE(SUM(CASE WHEN r.gp > r.gc THEN 3 WHEN r.gp = r.gc THEN 1 ELSE 0 END), 0) AS pontos
FROM teams t
LEFT JOIN (
  SELECT id AS match_id, home_team_id AS team_id, home_score AS gp, away_score AS gc FROM matches WHERE stage = 'group' AND status = 'finished'
  UNION ALL
  SELECT id, away_team_id, away_score, home_score FROM matches WHERE stage = 'group' AND status = 'finished'
) r ON r.team_id = t.id
GROUP BY t.id, t.group_name, t.name
ORDER BY grupo, pontos DESC, saldo DESC, gols_pro DESC;

CREATE VIEW v_artilharia AS
SELECT name AS jogador, team_name AS time, goals AS gols, assists AS assistencias, yellow AS amarelos, red AS vermelhos, mvp_count AS craque_do_jogo
FROM player_stats
WHERE goals > 0 OR assists > 0
ORDER BY goals DESC, assists DESC;

CREATE VIEW v_ranking_bolao AS
SELECT rank_pos AS posicao, display_name AS torcedor, total_points AS pontos, exact_scores AS placares_exatos, predictions_count AS palpites
FROM leaderboard
ORDER BY total_points DESC, exact_scores DESC;
