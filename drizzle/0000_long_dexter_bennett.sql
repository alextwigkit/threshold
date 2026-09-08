CREATE TABLE `inference_quota` (
	`user_id` text PRIMARY KEY NOT NULL,
	`day` text NOT NULL,
	`month` text NOT NULL,
	`daily` integer NOT NULL,
	`monthly` integer NOT NULL
);
