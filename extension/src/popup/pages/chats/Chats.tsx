import React, { useEffect, useState } from "react";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { Dialog, DialogTrigger, DialogPortal, DialogOverlay, DialogContent, DialogClose, DialogTitle } from "../../../components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { api, fetchMyProfile } from "../../../lib/api";
import { storage } from "../../../lib/storage";

type Thread = { id: string; title: string; updatedAt?: string | number | Date };

export default function Chats() {
  const navigate = useNavigate();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    (async () => {
      const user = await storage.get<{ id: string; email: string }>("user");
      if (!user) return navigate("/auth/login", { replace: true });
      setEmail(user.email);
      // fetch profile once → sync + access filter
      try {
        const profile = await fetchMyProfile();
        if (profile) {
          const isActive = Boolean((profile as any)?.is_active);
          await storage.setItems({
            provider_llm: profile.provider_llm ?? "",
            model_llm: profile.model_llm ?? "",
            api_key_llm: profile.api_key_llm ?? "",
            api_key_by_type: profile.api_key_by_type ?? "",
            url_by_type: profile.url_by_type ?? "",
            is_active: isActive,
          });
          if (!isActive) {
            navigate("/settings", { replace: true });
            return;
          }
        } else {
          const isActive = (await storage.get<boolean>("is_active")) ?? false;
          if (!isActive) {
            navigate("/settings", { replace: true });
            return;
          }
        }
      } catch {
        const isActive = (await storage.get<boolean>("is_active")) ?? false;
        if (!isActive) {
          navigate("/settings", { replace: true });
          return;
        }
      }
      setLoading(true);
      try {
        const list = await api.get(`/api/v1/threads?resourceId=${encodeURIComponent(user.id)}&agentId=n8nAgent`);
        const normalized = (list || []).map((t: any) => ({ id: t.id || t.threadId, title: t.title ?? "Untitled", updatedAt: t.updatedAt }));
        setThreads(normalized);
      } catch (e: any) {
        if (e?.status === 401) {
          await storage.clear();
          navigate('/auth/login', { replace: true });
          return;
        }
        setThreads([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function onCreate(title?: string) {
    const user = await storage.get<{ id: string }>("user");
    if (!user) return navigate("/auth/login", { replace: true });
    const isActive = (await storage.get<boolean>("is_active")) ?? false;
    if (!isActive) {
      navigate("/settings", { replace: true });
      return;
    }
    const safeTitle = title?.trim() || `Новый чат ${new Date().toLocaleString()}`;
    const created = await api.post(`/api/v1/threads`, {
      title: safeTitle,
      metadata: {},
      resourceId: user.id,
      agentId: "n8nAgent",
    });
    const newId = created?.id || created?.threadId;
    if (newId) navigate(`/chats/${newId}`);
  }

  async function onDelete(id: string) {
    const isActive = (await storage.get<boolean>("is_active")) ?? false;
    if (!isActive) {
      navigate("/settings", { replace: true });
      return;
    }
    await api.del(`/api/v1/threads/${id}`);
    setThreads((t) => t.filter((x) => x.id !== id));
  }

  return (
    <div className="px-2 pt-2 pb-0">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-sm">Чаты</div>
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button>Создать</Button>
            </DialogTrigger>
            <DialogPortal>
              <DialogOverlay />
              <DialogContent>
                <DialogTitle>Новый чат</DialogTitle>
                <TitleForm onSubmit={(t) => onCreate(t)} />
              </DialogContent>
            </DialogPortal>
          </Dialog>
          <Button variant="outline" onClick={() => navigate("/settings")}>Настройки</Button>
          <Button variant="outline" onClick={async () => { await storage.clear(); navigate("/auth/login", { replace: true }); }}>Выйти</Button>
        </div>
      </div>
      <div className="mt-3 mb-0">
        {loading ? (
          <div className="text-sm text-neutral-500">Загрузка…</div>
        ) : (
          <div className="list">
            {threads.length === 0 && <div className="text-sm text-neutral-500">Пусто. Создайте новый чат.</div>}
            {threads.map((t) => (
              <div key={t.id} className="list-item">
                <div>
                  <div className="font-semibold text-sm">{t.title}</div>
                  <div className="list-meta">{t.updatedAt ? new Date(t.updatedAt).toLocaleString() : ""}</div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => navigate(`/chats/${t.id}`)}>Открыть</Button>
                  <Button variant="destructive" onClick={() => onDelete(t.id)}>Удалить</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TitleForm({ onSubmit }: { onSubmit: (title: string) => void }) {
  const [value, setValue] = React.useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(value || `Новый чат ${new Date().toLocaleString()}`);
      }}
      className="grid gap-2"
    >
      <input className="input" placeholder="Название" value={value} onChange={(e) => setValue(e.target.value)} />
      <div className="flex gap-2 justify-end">
        <DialogClose asChild>
          <button className="btn btn-outline" type="button">Отмена</button>
        </DialogClose>
        <button className="btn btn-primary" type="submit">Создать</button>
      </div>
    </form>
  );
}


