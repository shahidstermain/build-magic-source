# AI Integration Guide - Lovable AI Gateway

## Overview
AndamanBazaar uses **Lovable AI Gateway** for all AI/LLM processing. This ensures consistent billing, rate limiting, and model access through Lovable's managed service.

## Current AI Features

### 1. Trip Planner (`trip-generate` function)
- **Model**: `google/gemini-2.5-pro`
- **Purpose**: Generate detailed Andaman trip itineraries
- **Input**: Trip preferences (days, budget, interests, islands)
- **Output**: Structured JSON with day-by-day plans, ferry logistics, budget breakdown

### 2. Listing Description Generator (`generate-listing-description` function)
- **Model**: `google/gemini-3-flash-preview`
- **Purpose**: Auto-generate marketplace listing descriptions
- **Input**: Title, category, condition, area, price
- **Output**: 2-3 sentence friendly description in Andaman local tone

## Integration Pattern

### Environment Setup
```typescript
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
if (!LOVABLE_API_KEY) {
  throw new Error("AI not configured");
}
```

### API Call Structure
```typescript
const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${LOVABLE_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "google/gemini-3-flash-preview", // or gemini-2.5-pro
    messages: [
      { role: "system", content: "System prompt..." },
      { role: "user", content: "User input..." },
    ],
    // Optional parameters:
    temperature: 0.7,
    max_tokens: 1000,
  }),
});
```

### Error Handling
```typescript
if (resp.status === 429) {
  return { error: "Too many requests, try again in a minute." };
}
if (resp.status === 402) {
  return { error: "AI credits exhausted. Add credits in Lovable workspace." };
}
if (!resp.ok) {
  console.error("AI gateway error", resp.status, await resp.text());
  return { error: "AI helper unavailable" };
}

const data = await resp.json();
const content = data?.choices?.[0]?.message?.content ?? "";
```

## Model Selection Guide

### `google/gemini-3-flash-preview`
- **Use for**: Quick text generation, simple classifications, short responses
- **Examples**: Listing descriptions, review summaries, content moderation
- **Advantages**: Fast, cost-effective
- **Limits**: ~1000 tokens output

### `google/gemini-2.5-pro`
- **Use for**: Complex reasoning, structured output, long-form content
- **Examples**: Trip planning, detailed recommendations, analysis
- **Advantages**: Higher quality, better reasoning, larger context
- **Limits**: Higher cost, slower response

## Security Best Practices

### 1. Authentication Required
```typescript
const authHeader = req.headers.get("Authorization") ?? "";
if (!authHeader.startsWith("Bearer ")) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
}

const userClient = createClient(supabaseUrl, anonKey, {
  global: { headers: { Authorization: authHeader } },
});
const { data: { user }, error } = await userClient.auth.getUser();
if (error || !user) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
}
```

### 2. Input Validation
```typescript
const title = String(body?.title ?? "").trim().slice(0, 200);
if (title.length < 3) {
  return new Response(JSON.stringify({ error: "Invalid input" }), { status: 400 });
}
```

### 3. Rate Limiting
- Lovable AI Gateway handles rate limiting automatically
- Return appropriate error messages for 429 responses
- Consider implementing client-side debouncing for user-triggered AI calls

## Future AI Enhancement Ideas

### 1. Review Intelligence
```typescript
// Edge function: analyze-reviews
const systemPrompt = `Analyze experience reviews and extract key insights:
- Overall sentiment (positive/negative/mixed)
- Common themes (safety, value, guide quality)
- Specific highlights and concerns
- Recommendation score (1-5)
Output as structured JSON.`;
```

### 2. Smart Experience Matching
```typescript
// Edge function: recommend-experiences
const systemPrompt = `You are an Andaman tourism expert. Based on user preferences, 
recommend the top 3 most suitable experiences from the provided list. Consider:
- Activity type preferences
- Budget constraints
- Group size and composition
- Previous booking history
- Seasonal factors`;
```

### 3. Dynamic Pricing Assistant
```typescript
// Edge function: suggest-pricing
const systemPrompt = `Analyze market data and suggest optimal pricing for this experience:
- Compare with similar offerings
- Consider seasonal demand patterns
- Factor in unique value propositions
- Account for local market conditions
Provide price range with reasoning.`;
```

### 4. Content Moderation
```typescript
// Edge function: moderate-content
const systemPrompt = `Review this user-generated content for:
- Inappropriate language or content
- Spam or promotional material
- Factual accuracy concerns
- Community guideline violations
Return: approved/flagged/rejected with reasons.`;
```

## Implementation Checklist

When adding new AI features:

- [ ] Use Lovable AI Gateway endpoint
- [ ] Include proper authentication
- [ ] Handle all error cases (401, 402, 429, 500)
- [ ] Validate and sanitize inputs
- [ ] Choose appropriate model for task complexity
- [ ] Add structured error logging
- [ ] Test with rate limiting scenarios
- [ ] Document system prompts and expected outputs
- [ ] Add client-side loading states and error handling

## Cost Optimization

1. **Choose the right model**: Use Flash for simple tasks, Pro for complex reasoning
2. **Optimize prompts**: Be specific and concise to reduce token usage
3. **Cache results**: Store AI-generated content to avoid repeated calls
4. **Batch processing**: Combine multiple requests when possible
5. **User limits**: Implement reasonable usage limits per user

## Monitoring & Debugging

- Monitor AI gateway response times and error rates
- Log structured errors with context for debugging
- Track token usage and costs through Lovable dashboard
- Set up alerts for high error rates or credit exhaustion
- Test edge cases and error scenarios regularly

This guide ensures all future AI integrations maintain consistency with the existing Lovable AI infrastructure while following security and performance best practices.