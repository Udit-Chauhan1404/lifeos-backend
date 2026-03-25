const stripe = require("../config/stripe");
const prisma  = require("../config/prisma");
const logger  = require("../utils/logger");

const PLANS = {
  pro:  { priceId: process.env.STRIPE_PRO_PRICE_ID,  name: "Pro"  },
  team: { priceId: process.env.STRIPE_TEAM_PRICE_ID, name: "Team" },
};

const getOrCreateCustomer = async (user) => {
  if (user.stripeCustomerId) return user.stripeCustomerId;
  const customer = await stripe.customers.create({ email: user.email, name: user.name, metadata: { userId: user.id } });
  await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customer.id } });
  return customer.id;
};

exports.createCheckoutSession = async (user, plan, successUrl, cancelUrl) => {
  const customerId = await getOrCreateCustomer(user);
  const priceId    = PLANS[plan]?.priceId;
  if (!priceId) throw new Error(`Invalid plan: ${plan}`);
  return stripe.checkout.sessions.create({
    customer: customerId, mode: "subscription", payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
    metadata: { userId: user.id, plan },
    allow_promotion_codes: true,
  });
};

exports.createPortalSession = async (user, returnUrl) => {
  const customerId = await getOrCreateCustomer(user);
  return stripe.billingPortal.sessions.create({ customer: customerId, return_url: returnUrl });
};

exports.handleWebhook = async (event) => {
  const obj = event.data.object;
  switch (event.type) {
    case "checkout.session.completed": {
      const { userId, plan } = obj.metadata;
      await prisma.user.update({ where: { id: userId }, data: { plan, stripeSubscriptionId: obj.subscription, subscriptionStatus: "active" } });
      logger.info(`Subscription activated: ${userId} → ${plan}`);
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const user = await prisma.user.findFirst({ where: { stripeSubscriptionId: obj.id } });
      if (!user) break;
      const active = obj.status === "active";
      await prisma.user.update({ where: { id: user.id }, data: { subscriptionStatus: obj.status, plan: active ? user.plan : "free", subscriptionEndsAt: obj.cancel_at ? new Date(obj.cancel_at * 1000) : null } });
      break;
    }
  }
};
