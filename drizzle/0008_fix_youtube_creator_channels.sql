-- Official channel IDs supplied by the RK75 administrator.
-- Resetting the metadata timestamp forces one immediate safe profile refresh after deployment.
UPDATE `creators`
SET
  `platform_channel_id` = CASE `platform_username`
    WHEN 'rayanplaysyt' THEN 'UCSlEGHrS0HtskiHRBB5dAoQ'
    WHEN 'nightly3z' THEN 'UCbFm0aP2xvt64Pc9D5T3OrA'
    WHEN 'tsgaming89' THEN 'UCZeoS5VSaO3WmIuszW6RfNg'
    WHEN 'dragooyt75' THEN 'UCKv42cp8s1jZCRzzB8xPzVA'
  END,
  `last_metadata_sync_at` = NULL,
  `profile_checked_at` = NULL,
  `updated_at` = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE `platform` = 'youtube'
  AND `platform_username` IN ('rayanplaysyt', 'nightly3z', 'tsgaming89', 'dragooyt75');
