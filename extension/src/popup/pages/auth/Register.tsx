import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Card, CardContent } from "../../../components/ui/card";
import { api } from "../../../lib/api";
import { storage } from "../../../lib/storage";

export default function Register() {
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
      await api.post("/api/v1/register", { email, password });
      await storage.setItems({ "just-registered": true });
      navigate("/settings", { replace: true });
    } catch (e: any) {
      setError("Не удалось зарегистрировать пользователя");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-2">
      <h3 className="font-semibold text-sm mb-3">Agent n8n — Регистрация</h3>
      <form onSubmit={onSubmit} className="grid gap-2">
        <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input type="password" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <div className="text-sm text-red-700">{error}</div>}
        <Button disabled={loading} type="submit">{loading ? "Регистрация..." : "Зарегистрироваться"}</Button>
      </form>
      <div className="text-xs text-neutral-500 mt-2">
        Уже есть аккаунт? <Link to="/auth/login" className="underline">Войти</Link>
      </div>
    </div>
  );
}


