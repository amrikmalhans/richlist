import webScraper from "./jobs/web-scraper";

async function main() {
  try {
    await webScraper();
  } catch (error) {
    console.log(error);
  }
}

main();
