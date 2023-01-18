import { login, logout, getSession, fetch } from "solid-auth-fetcher";
import { Parser } from "n3";

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function main() {
  async function getFriends(session) {
    const url = session.webId;
    let response = await fetch(url, {});
    let profile = await response.text();
    const parser = new Parser();
    let quads = parser.parse(profile);
    var friends = quads
      .filter((quad) => {
        return quad.predicate.value.includes("http://xmlns.com/foaf/0.1/knows");
      })
      .map((o) => o.object.id);

    document.getElementById("app").innerHTML = `
        <pre>${escapeHtml(friends.join("\n"))}</pre>
    `;
  }

  getSession().then(async (session) => {
    const form = document.querySelector('form[name="session"]');

    if (!session) {
      form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const profileUrl = event.target.querySelector('[name="profile"]').value;

        if (!profileUrl) {
          alert("Please fill in a valid webid URL");
          return;
        }

        let response = await fetch(profileUrl, {});
        let profile = await response.text();
        const parser = new Parser();

        let quads = parser.parse(profile);
        if (!quads) {
          alert("Could not parse profile");
          return;
        }

        quads.forEach((quad) => console.log(quad.predicate.id));

        const issuers = quads.filter(
          (quad) =>
            quad.predicate.id === "http://www.w3.org/ns/solid/terms#oidcIssuer"
        );

        console.log(issuers);

        session = await login({
          oidcIssuer: issuers[0].object.id,
          popUp: false,
          redirect: document.location.href
        });
        getFriends(session);
      });

      form.querySelector(".login").classList.remove("hidden");
    } else {
      form.querySelector('[name="logout"]').addEventListener("click", (e) => {
        logout().then(() => {
          document.location = document.location.href;
        });
      });

      form.querySelector(".logout").classList.remove("hidden");
      getFriends(session);
    }
    document.body.classList.remove("js-loading");
  });
}

main();
