globalThis.WORKER_CST = {
  MSG: {
    PATH_FOUND: 0,
    INIT_MAP: 1,
    INIT_ACTOR: 2,
    FIND_PATH: 3,
    APPLY_LAYER: 4,
    REMOVE_LAYER: 5,
    // Finding a path to an object is different than finding a path to a single tile
    FIND_PATH_TO_OBJECT: 6
  },
  // Format of a message
  MESSAGE_TYPE: "messageType",
  DATA: "dataSent",
  // maximum iterations done by the astar algorithm
  ITERATIONS_PER_CALCULATION: 5000
};

// a little hack so this is an importable script both in normal modules
// as well in web workers, which do not support modules yet
if (typeof module !== "undefined") {
  module.exports = globalThis.WORKER_CST;
}
