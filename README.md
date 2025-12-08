# TheGuarantors Code challenge

> Dev: Juan Marcos Rigoli ([@rijuma](https://github.com/rijuma))

## Challenge instructions

Your task is to design and implement a backend API that validates and standardizes property addresses. The API should expose a single endpoint (ie POST /validate-address) that accepts a property address in free-form text and returns a structured, validated version of the address, including street, number, city, state, zip code. The service can restrict its output for US addresses only. Your solution should handle edge cases (ie partial addresses, typos, etc) gracefully and indicate whether the address is valid, corrected or unverifiable.

Include a short README explaining your thought process, any tools used (including AI prompts if available), and how to run your solution locally. You can choose one of the following programming languages: Python, Java, Javascript, C#, Golang, Kotlin, Typescript, Rust, or PHP. You are encouraged to to use AI assistants and mention how you used them. We are more interested in your ability to design thoughtful APIs, integrate with external systems, and communicate trade-offs than in writing everything from scratch. Clean code, clear error handling, and an easy-to-follow structure is key.

Also, please share a publicly-accessible git repository that can be cloned by our team.

## Challenge considerations

Based on the above instructions, I've chosen the following requirements:

- Framework: [Fastify](https://fastify.dev/) (Node.js + TypeScript)
- AI Assistants: ChatGPT 5.1 for investigation. Claude as a coding assistant.

The API should have an abstraction that allows "connectors" to different API services based on some flag, probably a list with comma separated services through an environment variable. The API will asynchronously search in all these services and based on some criteria will return a suggested final address and a list with alternative options that could be used by the API consumer if the address is too vague, for a better User Experience.

The API will be simple, no database, with a rate limit based on IP. Since the requirement is to expose a single endpoint, account handling will not be required. A simple API token will be provided by an env variable and needs to match a X-Token header included on every request.

The API will have a 10 minute cache based on the provided input and will implement a request coalescing for multiple concurrent similar requests.

## First discovery

For a first discovery I've used the following prompt on ChatGPT 5.1 Deep Research (see [full chat](https://chatgpt.com/share/69375fcc-763c-8012-aa0f-eb133077b5ad))

> I want to implement a backend API that validates and standardizes property addresses. The API should expose a single endpoint (ie POST /validate-address) that accepts a property address in free-form text and returns a structured, validated version of the address, including street, number, city, state, zip code. The service can restrict its output for US addresses only. Your solution should handle edge cases (ie partial addresses, typos, etc) gracefully and indicate whether the address is valid, corrected or unverifiable. I'm thinking about using Google Maps API to search for locations matching the free form text provided by the user. If a single marker is returned, it can be taken as the best option, and if multiple places are returned, I'd like to have suggestions for a criteria to select the best suitable option. Do consider some additional services to use, list advantages and disadvantages and have a few best alternatives regardless of paid services or free services to consider on the final project and a few free options or with suitable free tiers for a POC.

The response for this research is in [docs/01-main-discovery-and-overall-approach.pdf](docs/01-main-discovery-and-overall-approach.pdf).
