import React, { useEffect, useState } from "react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Card, CardContent } from "../../../components/ui/card";
import { getAgentPrefs, setAgentPrefs, PREF_KEYS, type AgentPrefs } from "../../../lib/prefs";
import { LLM_PROVIDERS, getModelsByProviderId } from "../../../lib/llm-providers";
import { fetchMyProfile, updateMyProfile } from "../../../lib/api";
import { storage } from "../../../lib/storage";
import { useNavigate } from "react-router-dom";

export default function Settings() {
  const navigate = useNavigate();
  const [values, setValues] = useState<AgentPrefs>({
    model_llm: "",
    api_key_llm: "",
    provider_llm: "",
    api_key_by_type: "",
    url_by_type: "",
    role: "",
    is_active: false,
    type_agent: "",
  });
  const [saving, setSaving] = useState(false);
  const providerModels = getModelsByProviderId(values.provider_llm || "");

  useEffect(() => {
    (async () => {
      // сначала локальные значения
      const prefs = await getAgentPrefs();
      let initial = { ...prefs };
      // затем подставим из БД (если есть)
      const profile = await fetchMyProfile();
      if (profile) {
        initial = {
          ...initial,
          provider_llm: profile.provider_llm ?? initial.provider_llm,
          model_llm: profile.model_llm ?? initial.model_llm,
          api_key_llm: profile.api_key_llm ?? initial.api_key_llm,
          api_key_by_type: profile.api_key_by_type ?? initial.api_key_by_type,
          url_by_type: profile.url_by_type ?? initial.url_by_type,
          role: (profile as any).role ?? initial.role,
          is_active: (profile as any).is_active ?? initial.is_active,
          type_agent: (profile as any).type_agent ?? initial.type_agent,
        };
        await storage.setItems({
          provider_llm: initial.provider_llm,
          model_llm: initial.model_llm,
          api_key_llm: initial.api_key_llm,
          api_key_by_type: initial.api_key_by_type,
          url_by_type: initial.url_by_type,
          role: (profile as any).role ?? null,
          is_active: Boolean((profile as any).is_active ?? initial.is_active),
          type_agent: (profile as any).type_agent ?? null,
          source: (profile as any).source ?? null,
        });
      }
      setValues(initial);
    })();
  }, []);

  function onChange<K extends keyof AgentPrefs>(key: K, val: AgentPrefs[K]) {
    setValues((v) => ({ ...v, [key]: val }));
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!values.provider_llm || !values.model_llm || !values.api_key_llm) {
      alert("Укажите провайдера, модель и API ключ LLM");
      return;
    }
    setSaving(true);
    try {
      await setAgentPrefs(values);
      const payload: any = {
        provider_llm: values.provider_llm,
        model_llm: values.model_llm,
        api_key_llm: values.api_key_llm,
      };
      if (values.role === 'pro') {
        payload.api_key_by_type = values.api_key_by_type;
        payload.url_by_type = values.url_by_type;
      }
      await updateMyProfile(payload);
      const jr = await storage.get<boolean>("just-registered");
      if (jr) {
        await storage.setItems({ "just-registered": null });
        navigate("/chats", { replace: true });
      } else {
        navigate(-1);
      }
    } catch (e: any) {
      if (e?.status === 401) {
        await storage.clear();
        navigate('/auth/login', { replace: true });
        return;
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container">
      <div className="header">
        <div className="font-semibold text-sm">Настройки агента</div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}>Назад</Button>
          <Button onClick={onSave} disabled={saving}>{saving ? "Сохранение..." : "Сохранить"}</Button>
        </div>
      </div>
      <div className="card mt-3">
        <div className="card-body">
          <form onSubmit={onSave} className="grid gap-4">
            <div className="grid gap-2">
              <div className="text-xs text-neutral-500 font-semibold uppercase">LLM (openai, anthropic, etc.)</div>
              <div className="grid gap-1">
                <div className="text-xs font-medium text-neutral-700">Провайдер LLM</div>
                <select className="input" value={values.provider_llm} onChange={(e) => onChange("provider_llm", e.target.value)}>
                  <option value="">— не выбран —</option>
                  {LLM_PROVIDERS.map((p) => (
                    <option key={`${p.title}-${p.envVar}-${p.id}`} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>
              {values.provider_llm && (
                <div className="grid gap-1">
                  <div className="text-xs font-medium text-neutral-700">Модель LLM</div>
                  <select className="input" value={values.model_llm} onChange={(e) => onChange("model_llm", e.target.value)}>
                    <option value="">— выберите модель —</option>
                    {providerModels.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              )}
              {values.provider_llm && values.model_llm && (
                <div className="grid gap-1">
                  <div className="text-xs font-medium text-neutral-700">API ключ LLM</div>
                  <Input placeholder="api_key_llm" value={values.api_key_llm} onChange={(e) => onChange("api_key_llm", e.target.value)} />
                </div>
              )}
            </div>
            <br/>
            <div className="grid gap-2 mt-3">
              <div className="text-xs text-neutral-500 font-semibold uppercase">Сервер n8n (доступен пользователям PRO)</div>
              <div className="grid gap-1">
                <div className="text-xs font-medium text-neutral-700">API ключ (изменить если свой)</div>
                <Input placeholder="api_key_by_type" value={values.api_key_by_type} onChange={(e) => onChange("api_key_by_type", e.target.value)} disabled={values.role !== 'pro'} />
              </div>
              <div className="grid gap-1">
                <div className="text-xs font-medium text-neutral-700">URL (изменить если свой)</div>
                <Input placeholder="url_by_type" value={values.url_by_type} onChange={(e) => onChange("url_by_type", e.target.value)} disabled={values.role !== 'pro'} />
              </div>
            </div>
            <br/>
            <br/>
            <div className="text-xs text-neutral-500 font-semibold uppercase mt-3">Оформить подписку PRO</div>
            <div className="grid gap-2 mt-2">
              <div className="text-xs text-neutral-600">Для подключения обратитесь к менеджеру:</div>
              <div className="flex items-center gap-2">
                <a
                  className="btn btn-tg"
                  href="tg://resolve?phone=77066318623"
                  target="_blank"
                  rel="noreferrer"
                >Telegram</a>
                <a
                  className="btn btn-wa"
                  href="https://wa.me/77066318623"
                  target="_blank"
                  rel="noreferrer"
                >WhatsApp</a>
              </div>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}


