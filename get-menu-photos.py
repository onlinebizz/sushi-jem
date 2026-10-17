"""Run once on a computer with internet:  python3 get-menu-photos.py
Downloads all menu photos into images/menu/ so the website works without hotlinking.
Set 1: the owner's HungerStation product photos (HS CDN, vendor 194512).
Set 2: illustrative stock photography from Unsplash for items without owner photos
(new additions and the dishes whose shared CDN photo was a mismatch)."""
import os, urllib.request
HSB = "https://hungerstation.dhmedia.io/image/"
def G(a, b): return HSB + "global-menu-service/HS_SA/vendor/194512/product/" + a + "/" + b + "?width=800&quality=75"
def V(f): return HSB + "vso-so-backend/HS_SA/HT1DE4/" + f + "?width=800&quality=75"
def U(pid): return "https://images.unsplash.com/photo-" + pid + "?w=3200&q=85&auto=format"
HS = {
 "r1": G("139423946", "6f549ce8-1bdd-4ff1-885f-6040d3b4a7d1.jpg"),
 "r2": G("139423945", "bc9e996c-c766-428b-a4cf-e2fa2a0e1760.jpg"),
 "r3": G("139423958", "a2e0e982-3745-403a-bfbf-ce9eb282ffc3.jpg"),
 "r4": G("139423949", "579bc00e-68f4-4390-91a1-721c266adb87.jpg"),
 "box": G("139423964", "061fe3e5-b0e9-4822-9cc5-3aadcd9651fe.jpg"),
 "cup": G("139423954", "0ce08aae-5bb5-470e-ac7e-c35a7bd98773.jpg"),
 "poke": V("attachment__1789297332626932396.jpeg"),
 "onigiri": V("attachment__1789297332630456126.png"),
 "a1": V("attachment__1789297332620532380.jpg"),
 "a2": V("attachment__1789297332625047133.jpeg"),
 "a3": V("attachment__1789297332628594764.png"),
 "s1": V("attachment__1789297332823189965.JPG"),
 "s2": V("attachment__1789297332628795708.jpg"),
 "s3": V("attachment__1789297332619520128.jpg"),
 "s5": G("139423973", "aeb8b0f2-55f9-40d7-ada5-e18a286edcb7.jpg"),
 "s6": V("attachment__1789297332628316077.jpeg"),
 "s7": V("attachment__1789297332629277299.jpg"),
 "d6": V("attachment__1789297332817643339.jpg"),
}
STOCK = {
 "burger": U("1607301405891-3b679d1396e0"),
 "best": U("1736885978380-8d7d9f7d7880"),
 "rollipop": U("1617196035154-1e7e6e28b0db"),
 "burrito": U("1726824861360-ceecef8fdaeb"),
 "volcano": U("1696463469919-def9b2830857"),
 "gyozac": U("1534422298391-e4f8c172dddb"),
 "gyozach": U("1558220831-9ad8f955fb9b"),
 "katsu": U("1569050467447-ce54b3bbc37d"),
 "rb": U("1617421753170-46511a8d73fc"),
 "rv": U("1612927601601-6638404737ce"),
 "nc": U("1612929633738-8fe44f7ec841"),
 "nv": U("1553621043-f607bfbf6640"),
 "jdrink": U("1604259596747-2377448d916d"),
 "bt": U("1624896276654-2eb0c7e8247c"),
 "soda": U("1567103472667-6898f3a79cf2"),
}
os.makedirs(os.path.join(os.path.dirname(os.path.abspath(__file__)), "images", "menu"), exist_ok=True)
for k, u in dict(HS, **STOCK).items():
    dst = os.path.join(os.path.dirname(os.path.abspath(__file__)), "images", "menu", k + ".jpg")
    if os.path.exists(dst): continue
    try:
        req = urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"})
        open(dst, "wb").write(urllib.request.urlopen(req, timeout=60).read()); print("ok", k)
    except Exception as e:
        print("failed", k, e)
