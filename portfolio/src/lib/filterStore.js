import { createStore } from "./store.js";

// Active project filter ("all" or a tag from data/projects.js). Shared so the
// hero's stack chips can jump straight to a pre-filtered project list.
export const filterStore = createStore("all");

export const setFilter = (tag) => filterStore.set(tag);
