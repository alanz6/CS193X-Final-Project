import FollowList from "./followlist.js";
import User, { Post } from "./user.js";

export default class App {
  constructor() {
    /* Store the currently logged-in user. */
    this._user = null;

    this._onListUsers = this._onListUsers.bind(this);
    this._onLogin = this._onLogin.bind(this);
    this._onAddFollower = this._onAddFollower.bind(this);
    this._onRemoveFollower = this._onRemoveFollower.bind(this);
    this._onChangeName = this._onChangeName.bind(this);
    this._onChangeURL = this._onChangeURL.bind(this);
    this._onSearch = this._onSearch.bind(this);

    this._loginForm = document.querySelector("#loginForm");
    this._postForm = document.querySelector("#postForm");
    this._nameSubmit = document.querySelector("#nameSubmit");
    this._avatarSubmit = document.querySelector("#avatarSubmit");
    this._sidebar = document.querySelector("#sidebar");

    this._loginForm.listUsers.addEventListener("click", this._onListUsers);
    this._loginForm.login.addEventListener("click", this._onLogin);
    this._nameSubmit.addEventListener("click", this._onChangeName);
    this._avatarSubmit.addEventListener("click", this._onChangeURL);
    this._loginForm.search.addEventListener("click", this._onSearch);

    this._followList = new FollowList(document.querySelector("#feedPanel"), this._onAddFollower, this._onRemoveFollower);
  }

  /*** Event handlers ***/

  async _onListUsers() {
    let user_ids = await User.listUsers();
    let target_ind = user_ids.indexOf(this._user.id);
    user_ids.splice(target_ind, 1);
    let users = [];
    for (let user_id of user_ids) {
      users.push(await User.load(user_id));
    }
    users.sort((a, b) => {
      let shared_artist_a = 0;
      let shared_artist_b = 0;
      for (let artist of this._user.following) {
        if (a.following.includes(artist)) {
          shared_artist_a += 1;
        }
        if (b.following.includes(artist)) {
          shared_artist_b += 1;
        }
      }
      return shared_artist_b - shared_artist_a;
    });

    let similar_users = [];
    for (let i = 0; i < users.length; i++) {
      similar_users.push(users[i].id);
    }
    let usersStr = similar_users.join("\n");
    alert(`List of users with shared top artists as you:\n\n${usersStr}`);
  }

  async _onLogin(event) {
    event.preventDefault();
    console.log(this._loginForm.userid.value);
    this._user = await User.loadOrCreate(this._loginForm.userid.value);
    await this._loadProfile(this._user);
  }

  async _onSearch(event) {
    event.preventDefault();
    console.log(this._loginForm.userid.value);
    let user = await User.load(this._loginForm.userid.value);
    await this._loadProfile(user);
  }

  async _onAddFollower(id) {
    try {
      await this._user.addFollow(id);
    } catch (e) {
      alert(e);
    }
    await this._loadProfile(this._user);
  }

  async _onRemoveFollower(id) {
    await this._user.deleteFollow(id);
    await this._loadProfile(this._user);
  }

  async _onChangeName(event) {
    event.preventDefault();
    this._user.name = document.querySelector("#nameInput").value;
    await this._user.save();
    await this._loadProfile(this._user);
  }

  async _onChangeURL(event) {
    event.preventDefault();
    this._user.avatarURL = document.querySelector("#avatarInput").value;
    await this._user.save();
    await this._loadProfile(this._user);
  }

  /*** Helper methods ***/

  /* Load (or reload) a user's profile. Assumes that this._user has been set to a User instance. */
  async _loadProfile(user) {
    document.querySelector("#welcome").classList.add("hidden");
    document.querySelector("#main").classList.remove("hidden");
    document.querySelector("#idContainer").textContent = this._user.id;

    /* Update the avatar, name, and user ID in the new post form */
    console.log(user);
    this._postForm.querySelector(".avatar").src = user.avatarURL;
    this._postForm.querySelector(".name").textContent = user;
    this._postForm.querySelector(".userid").textContent = user.id;

    document.querySelector("#nameInput").value = this._user.name;
    document.querySelector("#avatarInput").value = this._user.avatarURL;

    if (user == this._user) {
      this._followList.setList(user.following, true);
      this._followList._form.classList.remove("hidden");
      this._sidebar.classList.remove("hidden");
    } else {
      this._followList.setList(user.following, false);
      this._followList._form.classList.add("hidden");
      this._sidebar.classList.add("hidden");
    }
  }
}
