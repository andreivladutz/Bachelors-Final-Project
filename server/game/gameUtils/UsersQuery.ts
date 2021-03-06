/** Utilities useful for user-related db querying */
import User, { UserType } from "../../models/User";
import CST from "../../../public/common/CommonCST";
import GameObjectsManager from "./GameObjectsManager";
import GameInstance from "../GameInstance";

// Messaging
import { Users } from "../../../public/common/MessageTypes";

// How many users per page are in the leaderboard
const LB_LIMIT = CST.USERS_QUERY.LEADERBOARD_LIMIT;
// Project queries
type Projection = {
  [property: string]: 0 | 1;
};

// Get the number of registered users
export async function usersCount(): Promise<number> {
  return await User.find()
    .estimatedDocumentCount()
    .exec();
}

// The number of pages the leaderboard has
export async function leaderboardPageCount() {
  return Math.ceil((await usersCount()) / LB_LIMIT);
}

// Get the users on this page with @page number for the leaderboard
// Page count expected from 1 to pageCount
export async function getLbUsersPage(page: number, project: Projection) {
  page--;

  return await User.find()
    .populate("game.islands")
    .skip(page * LB_LIMIT)
    .limit(LB_LIMIT)
    .select(project)
    .exec();
}

// Each user's GameInstance has a UsersManager component
export default class UsersManager extends GameObjectsManager {
  constructor(gameInstance: GameInstance) {
    super(gameInstance);

    this.initListeners();
  }

  // Get any page
  private async sendLeaderboardPage(pg: number, ack: Users.GetPageAck) {
    let currPage: Users.LeaderboardPage = [];

    // Get details about the users on this page of the leaderboard
    for (let user of await getLbUsersPage(pg, { name: 1, "game.islands": 1 })) {
      let userDoc = user as UserType;
      // Count the islands, the buildings and the characters owned by the user
      let islandCount = userDoc.game.islands.length;
      let buildingsCount = 0,
        charasCount = 0;

      for (let i = 0; i < islandCount; i++) {
        buildingsCount += userDoc.game.islands[i].buildings.length;
        charasCount += userDoc.game.islands[i].characters.length;
      }

      currPage.push({
        name: userDoc.name,
        islandCount,
        buildingsCount,
        charasCount,
      });
    }

    let initCfg: Users.LeaderboardInit = {
      pagesCount: await leaderboardPageCount(),
      page: currPage,
    };

    ack(initCfg);
  }

  public initListeners() {
    this.sender.on(Users.LEADERB_GET_PAGE, this.sendLeaderboardPage.bind(this));
  }
}
