import { createBrowserRouter } from 'react-router-dom'
import App from '../App'
import Home from '../pages/Home'
import Communities from '../pages/Communities'
import Community from '../pages/Community'
import Profile from '../pages/Profile'
import Login from '../pages/Login'
import Register from '../pages/Register'
import PostDetail from '../pages/PostDetail'
import CommunityModeration from '../pages/CommunityModeration'
import DebugPage from '../debug'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: 'communities', element: <Communities /> },
      { path: 'community/:id', element: <Community /> },
      { path: 'community/:communityId/moderation', element: <CommunityModeration /> },
      { path: 'profile', element: <Profile isUser={true} /> },
      { path: 'profile/:username', element: <Profile isUser={false} /> },
      { path: 'login', element: <Login /> },
      { path: 'register', element: <Register /> },
      { path: 'post/:postId', element: <PostDetail /> },
      { path: 'debug', element: <DebugPage /> },
    ],
  },
])