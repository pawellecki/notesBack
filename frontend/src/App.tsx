import { Component, onMount, onCleanup } from 'solid-js';
import { Routes, Route, Navigate } from 'solid-app-router';
import { Toaster } from 'solid-toast';
import styles from './App.module.css';
import Tinder from './pages/tinder';
import Notes from './pages/notes/notes';
import NewNote from './pages/newNote/NewNote';
import EditNote from './pages/editNote/EditNote';
import Auth from './pages/auth/Auth';
import { loggedInUser, setLoggedInUser } from '../globalStore';
import Button from './components/Button/Button';

const App: Component = () => {
  const userData = localStorage.getItem('userData') ?? '';
  const { userId, email, token, expiration } =
    (userData && JSON.parse(userData)) ?? {};
  const isNotExpriedToken = new Date(expiration) > new Date();

  if (token && isNotExpriedToken) {
    setLoggedInUser({ userId, email, token });
  }

  const logout = () => {
    setLoggedInUser(undefined);
    localStorage.removeItem('userData');
  };

  onMount(() => {
    let logoutTimer;
    if (token && expiration) {
      const remainingTime =
        new Date(expiration).getTime() - new Date().getTime();

      logoutTimer = setTimeout(logout, remainingTime);
    } else {
      clearTimeout(logoutTimer);
    }
  });

  return (
    <div class={styles.App}>
      <div>
        {JSON.stringify(loggedInUser())}
        <p>heeeeeeeeader zalogowany {loggedInUser()?.email}</p>
        <p>admin: 4d6 || kot: 11e || pies: 123</p>
        <Button onClick={logout}>logout</Button>
      </div>

      <div>sidebar</div>
      <Toaster />
      {loggedInUser() && (
        <Routes>
          <Route path="/" element={<Notes />} />
          <Route path="/tinder" element={<Tinder />} />
          {/* <Route path="/:userId/notes" element={<UpdateNote />} /> */}
          <Route path="/notes/new" element={<NewNote />} />
          <Route path="/notes/:id" element={<EditNote />} />
        </Routes>
      )}

      {!loggedInUser() && (
        <Routes>
          <Route path="/:any">
            <Navigate href={'/'} />
          </Route>
          <Route path="/" element={<Auth />} />
        </Routes>
      )}

      {/* <Route path="/">
  <Users /> user/pages/users
</Route> */}
      {/* <Route path="/:userId/places">
  <UserPlaces />
</Route> */}
      {/* <Route path="/places/new">
  <NewPlace />
</Route> */}
      {/* <Route path="/places/:placeId">
  <UpdatePlace />
</Route> */}
    </div>
  );
};

export default App;
