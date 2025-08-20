import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Card, CardContent } from "../../../components/ui/card";
import { api } from "../../../lib/api";
import { storage } from "../../../lib/storage";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await api.post<{ accessToken: string; user: { id: string; email: string } }>("/api/v1/auth/login", { email, password });
      await storage.setItems({ accessToken: data.accessToken, user: data.user, "sb-access-token": data.accessToken });
      navigate("/chats", { replace: true });
    } catch (e: any) {
      setError("Неверный email или пароль");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-2">
      <h3 className="font-semibold text-sm mb-3">Вход</h3>
      <form onSubmit={onSubmit} className="grid gap-2">
        <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input type="password" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <div className="text-sm text-red-700">{error}</div>}
        <Button disabled={loading} type="submit">{loading ? "Вход..." : "Войти"}</Button>
      </form>
      <div className="text-xs text-neutral-500 mt-2">
        Нет аккаунта? <Link to="/auth/register" className="underline">Зарегистрироваться</Link>
      </div>
    </div>
  );
}


