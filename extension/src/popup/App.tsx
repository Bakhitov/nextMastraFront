import React from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Chats from "./pages/chats/Chats";
import ChatThread from "./pages/chats/ChatThread";
import Settings from "./pages/settings/Settings";
import Layout from "./Layout";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/chats" />} />
        <Route path="/auth/login" element={<Layout><Login /></Layout>} />
        <Route path="/auth/register" element={<Layout><Register /></Layout>} />
        <Route path="/chats" element={<Layout><Chats /></Layout>} />
        <Route path="/chats/:threadId" element={<Layout><ChatThread /></Layout>} />
        <Route path="/settings" element={<Layout><Settings /></Layout>} />
      </Routes>
    </HashRouter>
  );
}


