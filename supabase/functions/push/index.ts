import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import webpush from "npm:web-push";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || 'BAsf0VKYVggPo_y-p8IR1GAV_qL4X-1-YDMyIxwCVs54U4c_6nKzaFCudxS4liBjB94SjCRGxcfsAJ9MbwBI8Pg';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || 'OSbeyvtg5z8OenOFA5bcxlmxEd1tGo5Pv6oz3nh2nuY';
const VAPID_SUBJECT = 'mailto:office@pqdremodels.com';

webpush.setVapidDetails(
  VAPID_SUBJECT,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

serve(async (req) => {
  try {
    // 1. Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 2. Get the incoming payload (Database Webhook)
    const payload = await req.json();
    
    // We only care about new messages
    if (payload.type !== 'INSERT' || payload.table !== 'messages') {
        return new Response(JSON.stringify({ message: "Ignored" }), { status: 200 });
    }

    const newMessage = payload.record;
    const receiverId = newMessage.receiver_id;

    // 3. Find push subscriptions for the receiver
    const { data: subscriptions, error } = await supabaseClient
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', receiverId);

    if (error || !subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ message: "No subscriptions found" }), { status: 200 });
    }

    // 4. Send a push notification to each subscribed device
    const pushPromises = subscriptions.map((sub) => {
      const payloadString = JSON.stringify({
        title: 'New Message',
        body: newMessage.content || 'You received a new message',
        url: '/messages.html'
      });
      return webpush.sendNotification(sub.subscription, payloadString);
    });

    await Promise.all(pushPromises);

    return new Response(JSON.stringify({ message: "Notifications sent!" }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
});
