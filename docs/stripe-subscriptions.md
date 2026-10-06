# Expert subscriptions

VidCut Studio's Expert plan is a USD $4.99/month Stripe subscription. It enables 1080p and higher server-rendered exports; free accounts remain limited to 720p.

## Configure Supabase

1. Create a Supabase project and enable Email auth.
2. Apply `supabase/migrations/20261006000000_subscriptions.sql` to the project.
3. Add the project URL and anon key as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. Add the same values as `SUPABASE_URL` and `SUPABASE_ANON_KEY`, and set the service-role key as `SUPABASE_SERVICE_ROLE_KEY`. Never expose the service-role key to the browser.

## Configure Stripe

1. Set `STRIPE_SECRET_KEY` on the server. Start with a Stripe test-mode secret key.
2. Create a recurring USD $4.99 monthly price for the product “VidCut Studio Expert” and set its Price ID as `STRIPE_EXPERT_PRICE_ID`.
3. Add a webhook endpoint at `https://<your-app-host>/api/stripe/webhook` and subscribe it to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Set the endpoint's signing secret as `STRIPE_WEBHOOK_SECRET`.
5. Set `APP_URL` to the public origin of this app, without a trailing slash.
6. Enable Stripe's customer portal in the Stripe Dashboard so subscribers can manage or cancel their plan.

The webhook writes subscription status into Supabase. The server checks the signed-in Supabase user and active subscription before allowing Full HD server-side rendering.
