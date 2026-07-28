'use client';

import React, { useState } from 'react';
import { AnalysisResult, CoachMessage } from '@/types';
import { Bot, Send, User, Sparkles, ShieldAlert } from 'lucide-react';
import { appConfig } from '@/config/appConfig';

interface AICoachPanelProps {
  performanceData?: AnalysisResult | null;
}

const getInitialText = (data?: AnalysisResult | null) => {
  if (!data) {
    return "Welcome to Piano Lab AI! 🎹 No performance analysis loaded yet. Please upload an audio clip or select a target piece and click 'START STUDIO ANALYSIS' to get personalized tips!";
  }

  const pitchStr = `Pitch: ${data.pitchAccuracy}%`;
  const rhythmStr = `Rhythm: ${data.rhythmAccuracy}%`;
  const scoreStr = `Overall Score: ${data.overallScore}%`;

  let tip = 'Practice with a metronome at 80% tempo to solidify even timing across complex passages.';
  if (data.pitchAccuracy < 80) {
    tip = 'Focus on pitch accuracy: slow down difficult measure transitions by 20% to build clean finger memory.';
  } else if (data.rhythmAccuracy < 80) {
    tip = 'Focus on rhythmic precision: eliminate micro-rushing on note onsets by counting quarter-note beats aloud.';
  } else {
    tip = 'Exceptional performance! Work on velocity dynamics (light touch vs strong accents) to add emotional depth.';
  }

  return `Hello! Here are your performance insights (${scoreStr} | ${pitchStr} | ${rhythmStr}):\n\n💡 Improvement Tip: ${tip}\n\nAsk me any question about timing, measure accuracy, or technique!`;
};

export const AICoachPanel: React.FC<AICoachPanelProps> = ({ performanceData }) => {
  const [messages, setMessages] = useState<CoachMessage[]>([
    {
      id: 'msg-1',
      sender: 'coach',
      text: getInitialText(performanceData),
      timestamp: 'Studio AI',
    },
  ]);

  React.useEffect(() => {
    if (performanceData) {
      const text = getInitialText(performanceData);
      setMessages((prev) => {
        if (prev.length === 1 && prev[0].id === 'msg-1') {
          return [
            {
              id: 'msg-1',
              sender: 'coach',
              text,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ];
        }
        return prev;
      });
    }
  }, [performanceData]);

  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isSending) return;

    const userText = inputMessage.trim();
    setInputMessage('');

    const userMsg: CoachMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsSending(true);

    try {
      const res = await fetch(`${appConfig.apiUrl}/coach/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: performanceData?.sessionId || 'sess-default',
          userMessage: userText,
          recentPerformanceData: performanceData,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const coachMsg: CoachMessage = {
          id: `coach-${Date.now()}`,
          sender: 'coach',
          text: data.replyMessage,
          isOffTopic: data.isOffTopic,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, coachMsg]);
      } else {
        throw new Error('Failed to contact coach');
      }
    } catch {
      const isOffTopic = !userText.toLowerCase().includes('piano') && !userText.toLowerCase().includes('note') && !userText.toLowerCase().includes('measure');
      const fallbackMsg: CoachMessage = {
        id: `coach-${Date.now()}`,
        sender: 'coach',
        text: isOffTopic
          ? "I'm strictly your Piano Lab advisor! Let's get back to practice time. Do you have a question about your timing or measure accuracy?"
          : "Great question! Focus on slowing down difficult passages by 20% BPM while maintaining even finger velocity.",
        isOffTopic,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="studio-card p-5 rounded-lg flex flex-col h-[480px]">
      <div className="flex items-center justify-between pb-4 border-b border-[#E2DFD7]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#111113] text-white flex items-center justify-center font-bold">
            <Bot className="w-4 h-4 text-[#C84B31]" />
          </div>
          <div>
            <h3 className="text-sm font-mono font-bold text-[#111113] uppercase flex items-center gap-1.5 tracking-wider">
              PIANO LAB AI ADVISOR <Sparkles className="w-3.5 h-3.5 text-[#C84B31] fill-current" />
            </h3>
            <p className="text-xs text-[#8C887B] font-mono">Interactive Piano Pedagogue Advisor</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pt-3 pr-1">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-2.5 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold shrink-0 ${
                msg.sender === 'user'
                  ? 'bg-[#111113] text-[#F6F4F0]'
                  : 'bg-[#F6F4F0] text-[#111113] border border-[#E2DFD7]'
              }`}
            >
              {msg.sender === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5 text-[#C84B31]" />}
            </div>

            <div
              className={`p-3 rounded-lg max-w-[85%] text-xs leading-relaxed border ${
                msg.sender === 'user'
                  ? 'bg-[#111113] text-[#F6F4F0] border-[#111113]'
                  : msg.isOffTopic
                  ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]'
                  : 'bg-[#F6F4F0] border-[#E2DFD7] text-[#111113]'
              }`}
            >
              {msg.isOffTopic && (
                <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-[#C84B31] mb-1">
                  <ShieldAlert className="w-3 h-3" /> OFF-TOPIC GUARDRAIL
                </div>
              )}
              {msg.text}
              <div
                className={`text-[10px] font-mono mt-1 text-right ${
                  msg.sender === 'user' ? 'text-[#A1A1AA]' : 'text-[#8C887B]'
                }`}
              >
                {msg.timestamp}
              </div>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSend} className="pt-3 border-t border-[#E2DFD7] flex items-center gap-2">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Ask AI coach about your timing, measures..."
          className="flex-1 px-3 py-2 rounded-lg bg-white border border-[#E2DFD7] text-xs text-[#111113] placeholder-[#8C887B] focus:outline-none focus:border-[#111113] transition-colors"
        />
        <button
          type="submit"
          disabled={isSending}
          className="p-2.5 rounded-lg bg-[#111113] hover:bg-[#C84B31] text-white font-bold transition-colors disabled:opacity-50"
        >
          <Send className="w-4 h-4 fill-current" />
        </button>
      </form>
    </div>
  );
};

