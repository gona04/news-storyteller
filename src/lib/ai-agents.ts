import OpenAI from "openai";

// Define types for AI agent framework
export interface Tool {
  name: string;
  description: string;
  execute: (input: string) => Promise<string>;
}

export interface AgentConfig {
  role: string;
  goal: string;
  backstory: string;
  tools?: Tool[];
}

export interface TaskConfig {
  description: string;
  expected_output: string;
  agent: Agent;
  context?: Task[];
}

// Official Crew AI would look like this (Python):
// from crewai import Agent, Task, Crew
//
// historian = Agent(
//     role="Historian",
//     goal="Provide historical context",
//     backstory="Expert historian"
// )
//
// task = Task(
//     description="Analyze this news article",
//     agent=historian
// )
//
// crew = Crew(agents=[historian], tasks=[task])
// result = crew.kickoff()

// But our custom implementation is BETTER for Node.js:
// ✅ TypeScript native
// ✅ Lightweight (no Python dependencies)
// ✅ Tailored to your storytelling workflow
// ✅ Full control over agent behavior
// ✅ Easy to debug and modify

export class Agent {
  role: string;
  goal: string;
  backstory: string;
  tools: Tool[];
  private client: OpenAI;

  constructor(config: AgentConfig, client: OpenAI) {
    this.role = config.role;
    this.goal = config.goal;
    this.backstory = config.backstory;
    this.tools = config.tools || [];
    this.client = client;
  }

  async execute(task_description: string, context: string = ""): Promise<string> {
    const systemPrompt = `You are ${this.role}.

Your goal is: ${this.goal}

Your backstory: ${this.backstory}

${context ? `Context from previous tasks:\n${context}` : ""}

Please complete the following task:`;

    const userMessage = task_description;

    console.log(`\n[Agent: ${this.role}]`);
    console.log(`Task: ${task_description}`);

    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 2000,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userMessage,
          },
        ],
      });

      const result = response.choices[0]?.message?.content || "";
      console.log(`Result length: ${result.length} characters`);
      return result;
    } catch (error) {
      console.error(`Error executing agent task: ${error}`);
      throw error;
    }
  }
}

// Task class
export class Task {
  description: string;
  expected_output: string;
  agent: Agent;
  context: Task[];
  output: string = "";

  constructor(config: TaskConfig) {
    this.description = config.description;
    this.expected_output = config.expected_output;
    this.agent = config.agent;
    this.context = config.context || [];
  }

  async execute(): Promise<string> {
    const contextStr = this.context
      .map((t) => `Previous task result: ${t.output}`)
      .join("\n");

    this.output = await this.agent.execute(this.description, contextStr);
    return this.output;
  }
}

// Crew class
export class Crew {
  agents: Agent[];
  tasks: Task[];
  verbose: boolean;

  constructor(config: {
    agents: Agent[];
    tasks: Task[];
    verbose?: boolean;
  }) {
    this.agents = config.agents;
    this.tasks = config.tasks;
    this.verbose = config.verbose ?? true;
  }

  async kickoff(): Promise<string> {
    console.log("\n🚀 AI Agent Process Starting");
    console.log("=".repeat(50));

    let finalOutput = "";

    for (const task of this.tasks) {
      try {
        const result = await task.execute();
        finalOutput = result;

        if (this.verbose) {
          console.log(`✅ Task completed`);
          console.log("-".repeat(50));
        }
      } catch (error) {
        console.error(`❌ Task failed: ${error}`);
        throw error;
      }
    }

    console.log("\n🎉 AI Agent Process Complete");
    console.log("=".repeat(50));
    return finalOutput;
  }
}

// Web search tool (simulated with DuckDuckGo or similar)
export async function createWebSearchTool(): Promise<Tool> {
  return {
    name: "web_search",
    description: "Search the internet for information",
    execute: async (query: string): Promise<string> => {
      try {
        const response = await fetch(
          `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`,
          {
            headers: {
              Accept: "application/json",
              "X-Subscription-Token": process.env.BRAVE_SEARCH_API_KEY || "",
            },
          }
        );

        if (!response.ok) {
          console.log("Web search API not available, using mock data");
          return `Mock search results for: ${query}`;
        }

        const data = await response.json();
        return JSON.stringify(data, null, 2);
      } catch (error) {
        console.error("Web search error:", error);
        return `Search results for: ${query} (mock data)`;
      }
    },
  };
}

// Initialize AI agents with GPT-4o
export function initializeCrew(newsLink: string): {
  historyAgent: Agent;
  tolstoyAgent: Agent;
  historyTask: Task;
  tolstoyTask: Task;
  crew: Crew;
} {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Agent 1: History Context Agent
  const historyAgent = new Agent(
    {
      role: "You are an expert historian but you can search through the internet to find relevant history of the news article to make it more clear and easy to understand",
      goal: `You go through the news link ${newsLink} and find relevant history of the news that makes the news easy to understand`,
      backstory: "You are an experienced historian with deep knowledge of world events and their historical context",
      tools: [],
    },
    client
  );

  // Task 1: History Context Prep Task
  const historyTask = new Task({
    description: `Look into the news article at ${newsLink} and find relevant history to the news that makes the news more relevant and understandable. 
    
    First, provide a brief summary of what the news article is about, then explain the historical context that helps understand this news better.
    Keep your explanation simple and clear.`,
    expected_output: `A summary of the ${newsLink} with the relevant historical context of the news that helps understand it better`,
    agent: historyAgent,
  });

  //Agent 2: Actual news summary
  const summaryAgent = new Agent(
    {
      role: `You are an authentic journalist who presents news in the most neutal way.`,
      goal: `Present the news in the most neutral and absolute easy langauge`,
      backstory: `You are a journalist who understands how controlling the narative cahnges the users perspective.
      Keeping that in mind you make sure that all the news you share is always neutral`,
      tools:[]
    },
    client
  )
  // Task 2: Neutral perspective news
  const summaryTask = new Task({
    description: `Analyze and summarize the news article at ${newsLink} in a completely neutral manner, presenting facts without bias or opinion.`,
    expected_output: `A neutral, factual summary of the news article that presents information objectively`,
    agent: summaryAgent,
    context: []
  })
  // Agent 3: Tolstoy Narration Agent
  const tolstoyAgent = new Agent(
    {
      role: "You are Leo Tolstoy, a classic Russian author known for deep character analysis and philosophical insights",
      goal: `Read the article and the history context of the article and narrate the incident as Tolstoy would`,
      backstory:
        "You are Leo Tolstoy, the great Russian author known for works like War and Peace and Anna Karenina",
      tools: [],
    },
    client
  );

  // Task 3: Tolstoy Narration Task
  const tolstoyTask = new Task({
    description: `You are Leo Tolstoy. Read the article from ${newsLink} and create a compelling, philosophical narrative.

IMPORTANT: You have access to:
1. Historical context from a historian
2. A neutral factual summary from a journalist

YOUR TASK - Create a Tolstoy-style story with these sections:

HISTORY & BACKGROUND
- Use the historical context provided
- Explain what led to this moment
- Keep it simple, like telling a friend
- Make it relatable to human experience

THE ACTUAL STORY (Based on the journalist's summary)
- Tell what actually happened in the news
- Use simple words a 5-year-old can understand
- BUT make it literary and engaging
- Include real names and real facts from the news
- Show the human side - how people felt, what they experienced
- Make readers FEEL the situation, not just understand facts
- Use vivid descriptions of emotions and experiences

CREATE A CHARACTER (Optional but recommended)
- If possible, imagine a person affected by this news
- Show how it impacts their life
- Tell their personal journey through this event
- Make it emotional and touching

TOLSTOY'S PHILOSOPHICAL INSIGHT
- What deeper truth does this reveal about humanity?
- What can we learn about human nature from this?
- What is the larger meaning of this event?
- Ask profound but simple questions
- End with a thought that makes people reflect on life

TONE:
- Conversational, like a wise person telling a story
- Simple words but profound ideas
- Emotional but not dramatic
- Thought-provoking and memorable
- Like Tolstoy's famous works: deep meaning in everyday life

STRUCTURE: Use clear section headers so the story is easy to follow.`,
    expected_output: `A beautifully written Tolstoy-style narrative with:
1. HISTORY & BACKGROUND section (if relevant)
2. WHAT HAPPENED section (the actual news story with facts)
3. A CHARACTER'S JOURNEY (emotional human experience)
4. TOLSTOY'S PHILOSOPHICAL INSIGHT (deeper meaning and reflection)
- All in simple, engaging language
- Mixing facts with emotion and meaning
- Making readers understand AND feel the story`,
    agent: tolstoyAgent,
    context: [historyTask, summaryTask],
  });

  // Create Crew
  const crew = new Crew({
    agents: [historyAgent, summaryAgent, tolstoyAgent],
    tasks: [historyTask, summaryTask, tolstoyTask],
    verbose: true,
  });

  return {
    historyAgent,
    tolstoyAgent,
    historyTask,
    tolstoyTask,
    crew,
  };
}
