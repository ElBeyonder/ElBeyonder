// Genera assets/contributions.svg con el calendario de contribuciones al estilo GitHub (modo oscuro).
import { writeFileSync } from "node:fs";

const user = process.env.GH_USER;
const token = process.env.GITHUB_TOKEN;

const query = `query($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks { contributionDays { contributionLevel date weekday } }
      }
    }
  }
}`;

const COLORS = {
  NONE: "#161b22",
  FIRST_QUARTILE: "#0e4429",
  SECOND_QUARTILE: "#006d32",
  THIRD_QUARTILE: "#26a641",
  FOURTH_QUARTILE: "#39d353",
};
const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export function render({ totalContributions, weeks }) {
  const cell = 11, gap = 3, step = cell + gap;
  const left = 38, top = 56, pad = 20;
  const width = left + weeks.length * step + pad;
  const height = top + 7 * step + 40;

  let out = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="-apple-system,Segoe UI,Helvetica,Arial,sans-serif">`;
  out += `<rect x=".5" y=".5" width="${width - 1}" height="${height - 1}" rx="6" fill="#0d1117" stroke="#30363d"/>`;
  out += `<text x="${pad}" y="30" fill="#e6edf3" font-size="16">${totalContributions.toLocaleString("en-US")} contribuciones en el último año</text>`;

  let lastMonth = -1;
  weeks.forEach((week, i) => {
    const first = week.contributionDays[0];
    const month = new Date(first.date + "T00:00:00Z").getUTCMonth();
    if (month !== lastMonth && i < weeks.length - 2) {
      out += `<text x="${left + i * step}" y="${top - 8}" fill="#8b949e" font-size="10">${MONTHS[month]}</text>`;
    }
    lastMonth = month;
    for (const d of week.contributionDays) {
      out += `<rect x="${left + i * step}" y="${top + d.weekday * step}" width="${cell}" height="${cell}" rx="2" fill="${COLORS[d.contributionLevel]}"><title>${d.date}</title></rect>`;
    }
  });

  [["Lun", 1], ["Mié", 3], ["Vie", 5]].forEach(([label, row]) => {
    out += `<text x="${pad}" y="${top + row * step + 9}" fill="#8b949e" font-size="10">${label}</text>`;
  });

  const legendX = width - pad - 5 * step - 70;
  const legendY = top + 7 * step + 22;
  out += `<text x="${legendX}" y="${legendY + 9}" fill="#8b949e" font-size="10" text-anchor="end">Menos</text>`;
  Object.values(COLORS).forEach((c, i) => {
    out += `<rect x="${legendX + 6 + i * step}" y="${legendY}" width="${cell}" height="${cell}" rx="2" fill="${c}"/>`;
  });
  out += `<text x="${legendX + 12 + 5 * step}" y="${legendY + 9}" fill="#8b949e" font-size="10">Más</text>`;
  return out + "</svg>\n";
}

if (process.env.GITHUB_ACTIONS) {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { login: user } }),
  });
  const json = await res.json();
  const calendar = json.data?.user?.contributionsCollection?.contributionCalendar;
  if (!calendar) throw new Error(`Respuesta inesperada: ${JSON.stringify(json)}`);
  writeFileSync("assets/contributions.svg", render(calendar));
}
