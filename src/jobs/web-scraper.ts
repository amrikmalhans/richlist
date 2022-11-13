import puppeteer from "puppeteer";
import supabase from "../utils/supabase";

// Making it db agnostic
interface Address {
  address: string | undefined;
  bought_weekly: number | null;
  sold_weekly: number | null;
  bought_monthly: number | null;
  sold_monthly: number | null;
  exchange: string | undefined;
}

async function webScraper() {
  try {
    // TODO: Best to make this a function and launch depending on the environment and OS.
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox"],
      executablePath: "/usr/bin/chromium-browser",
      defaultViewport: {
        width: 1920,
        height: 1080,
      },
    });

    const page = await browser.newPage();
    const allAddresses: Address[] = [];

    for (let i = 1; i < 2; i++) {
      await page.goto(
        `https://bitinfocharts.com/top-100-richest-bitcoin-addresses-${i}.html`
      );
      const addresses = await page.evaluate(() => {
        const list: Address[] = [];
        const items = document.querySelectorAll("tr");

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const boughtElements = item.querySelectorAll(
            "td.hidden-phone span.text-success"
          );
          const soldElements = item.querySelectorAll(
            "td.hidden-phone span.text-error"
          );

          const boughtAndSoldParent = item.querySelector(
            "td.hidden-phone span.hidden-phone"
          ) as HTMLElement;

          let boughtWeekly: number | null = null;
          let boughtMonthly: number | null = null;
          let soldWeekly: number | null = null;
          let soldMonthly: number | null = null;

          // If two elements exists for bought and sold elements, then in each node
          // first is weekly and second is monthly, but if only one element exists
          // then it is monthly. TODO: Extract this logic to a function.
          if (boughtElements.length === 2) {
            boughtWeekly = parseFloat(
              boughtElements[0]?.innerHTML.replace("+", "").replace(" BTC", "")
            );
            boughtMonthly = parseFloat(
              boughtElements[1]?.innerHTML.replace("+", "").replace(" BTC", "")
            );
          } else if (boughtElements.length === 1 && soldElements.length === 1) {
            // Now both bought and sold elements have only one element, so
            // we need to determine which is weekly and which is monthly.
            // We can do this by checking if the parent node of bought and sold
            // elements has a child node with class "text-success" or "text-error".
            // If first child node has class "text-success" then bought is weekly
            // and sold is monthly, and vice versa.
            if (
              boughtAndSoldParent?.children[0].classList.contains(
                "text-success"
              )
            ) {
              boughtWeekly = parseFloat(
                boughtElements[0]?.innerHTML
                  .replace("+", "")
                  .replace(" BTC", "")
              );
              soldMonthly = parseFloat(
                soldElements[0]?.innerHTML.replace("+", "").replace(" BTC", "")
              );
            } else {
              boughtMonthly = parseFloat(
                boughtElements[0]?.innerHTML
                  .replace("+", "")
                  .replace(" BTC", "")
              );
              soldWeekly = parseFloat(
                soldElements[0]?.innerHTML.replace("+", "").replace(" BTC", "")
              );
            }
          } else if (boughtElements.length === 1) {
            boughtMonthly = parseFloat(
              boughtElements[0]?.innerHTML.replace("+", "").replace(" BTC", "")
            );
          }

          if (soldElements.length === 2) {
            soldWeekly = parseFloat(
              soldElements[0]?.innerHTML.replace("+", "").replace(" BTC", "")
            );
            soldMonthly = parseFloat(
              soldElements[1]?.innerHTML.replace("+", "").replace(" BTC", "")
            );
          } else if (soldElements.length === 1 && !boughtElements.length) {
            soldMonthly = parseFloat(
              soldElements[0]?.innerHTML.replace("+", "").replace(" BTC", "")
            );
          }

          const exchange = item.querySelector("td small a")?.innerHTML;
          const address = item.querySelector("td a")?.innerHTML;

          list.push({
            address,
            bought_weekly: boughtWeekly,
            sold_weekly: soldWeekly,
            bought_monthly: boughtMonthly,
            sold_monthly: soldMonthly,
            exchange,
          });
        }

        return list;
      });

      allAddresses.push(...addresses);
    }

    const addressesWithTransactions = allAddresses.filter(
      (address) =>
        address.bought_weekly ||
        address.sold_weekly ||
        address.bought_monthly ||
        address.sold_monthly
    );

    const result = await supabase
      .from("scraped_bitcoin_richlist")
      .insert(addressesWithTransactions);

    console.log(result);

    await browser.close();
  } catch (error) {
    console.log(error);
  }
}

export default webScraper;
