const table = new WeakMap();
let counter = 0;
export default function hash(args: any[]): string {
  if (!args.length) return "";
  let key = "arg";
  for (let i = 0; i < args.length; ++i) {
    let _hash;
    if (args[i] === null || (typeof args[i] !== "object" && typeof args[i] !== "function")) {
      _hash = typeof args[i] === "string" ? '"' + args[i] + '"' : String(args[i]);
    } else {
      if (!table.has(args[i])) { _hash = counter; table.set(args[i], counter++); }
      else { _hash = table.get(args[i]); }
    }
    key += "@" + _hash;
  }
  return key;
}

export const hid = (obj: any) => {
  const chars = JSON.stringify(obj);
  let hc = 0;
  for (let i = 0; i < chars.length; i++) {
    hc = (hc * 31 + chars.charCodeAt(i)) | 0;
  }
  return hc;
};
