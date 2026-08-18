/** Docker container IDs from `docker ps` are hex (short or full). */
export const DOCKER_CONTAINER_ID_PATTERN = /^[a-f0-9]{6,64}$/i;

/** Persisted stats-history window per `(item_id, container_id)`. */
export const CONTAINER_MANAGER_HISTORY_MAX_POINTS = 60;
