"""Run once on a computer with internet:  python3 get-menu-photos.py
Downloads the menu photos into images/menu/ so the website works without hotlinking."""
import os, urllib.request
URLS = {
 "r1": "https://hungerstation.dhmedia.io/image/global-menu-service/HS_SA/vendor/194512/product/139423946/6f549ce8-1bdd-4ff1-885f-6040d3b4a7d1.jpg?width=1000&quality=80",
 "r2": "https://hungerstation.dhmedia.io/image/global-menu-service/HS_SA/vendor/194512/product/139423945/bc9e996c-c766-428b-a4cf-e2fa2a0e1760.jpg?width=1000&quality=80",
 "r3": "https://hungerstation.dhmedia.io/image/global-menu-service/HS_SA/vendor/194512/product/139423958/a2e0e982-3745-403a-bfbf-ce9eb282ffc3.jpg?width=1000&quality=80",
 "r4": "https://hungerstation.dhmedia.io/image/global-menu-service/HS_SA/vendor/194512/product/139423949/579bc00e-68f4-4390-91a1-721c266adb87.jpg?width=1000&quality=80",
 "box": "https://hungerstation.dhmedia.io/image/global-menu-service/HS_SA/vendor/194512/product/139423964/061fe3e5-b0e9-4822-9cc5-3aadcd9651fe.jpg?width=1000&quality=80",
 "cake": "https://hungerstation.dhmedia.io/image/global-menu-service/HS_SA/vendor/194512/product/139423948/c60f2e15-e453-490e-9f07-d058d251c474.jpg?width=1000&quality=80",
 "cup": "https://hungerstation.dhmedia.io/image/global-menu-service/HS_SA/vendor/194512/product/139423954/0ce08aae-5bb5-470e-ac7e-c35a7bd98773.jpg?width=1000&quality=80",
 "burger": "https://hungerstation.dhmedia.io/image/global-menu-service/HS_SA/vendor/194512/product/139423961/0a3a957c-5ace-4958-94b4-84864526dc66.jpg?width=1000&quality=80",
 "poke": "https://hungerstation.dhmedia.io/image/vso-so-backend/HS_SA/HT1DE4/attachment__1789297332626932396.jpeg?width=1000&quality=80",
 "onigiri": "https://hungerstation.dhmedia.io/image/vso-so-backend/HS_SA/HT1DE4/attachment__1789297332630456126.png?width=1000&quality=80",
 "rb": "https://images.unsplash.com/photo-1478749485505-2a903a729c63?w=1000&auto=format&fit=crop&q=80",
 "rv": "https://images.unsplash.com/photo-1558985212-324add95595a?w=1000&auto=format&fit=crop&q=80",
 "nc": "https://hungerstation.dhmedia.io/image/global-menu-service/HS_SA/vendor/194512/product/139423969/530f9ab0-48dd-4865-bc45-c5b0c1cfc5b0.jpg?width=1000&quality=80",
 "nv": "https://hungerstation.dhmedia.io/image/global-menu-service/HS_SA/vendor/194512/product/139423969/530f9ab0-48dd-4865-bc45-c5b0c1cfc5b0.jpg?width=1000&quality=80",
 "a1": "https://hungerstation.dhmedia.io/image/vso-so-backend/HS_SA/HT1DE4/attachment__1789297332620532380.jpg?width=1000&quality=80",
 "a2": "https://hungerstation.dhmedia.io/image/vso-so-backend/HS_SA/HT1DE4/attachment__1789297332625047133.jpeg?width=1000&quality=80",
 "a3": "https://hungerstation.dhmedia.io/image/vso-so-backend/HS_SA/HT1DE4/attachment__1789297332628594764.png?width=1000&quality=80",
 "s1": "https://hungerstation.dhmedia.io/image/vso-so-backend/HS_SA/HT1DE4/attachment__1789297332823189965.JPG?width=1000&quality=80",
 "s2": "https://hungerstation.dhmedia.io/image/vso-so-backend/HS_SA/HT1DE4/attachment__1789297332628795708.jpg?width=1000&quality=80",
 "s3": "https://hungerstation.dhmedia.io/image/vso-so-backend/HS_SA/HT1DE4/attachment__1789297332619520128.jpg?width=1000&quality=80",
 "s5": "https://hungerstation.dhmedia.io/image/global-menu-service/HS_SA/vendor/194512/product/139423973/aeb8b0f2-55f9-40d7-ada5-e18a286edcb7.jpg?width=1000&quality=80",
 "s6": "https://hungerstation.dhmedia.io/image/vso-so-backend/HS_SA/HT1DE4/attachment__1789297332628316077.jpeg?width=1000&quality=80",
 "s7": "https://hungerstation.dhmedia.io/image/vso-so-backend/HS_SA/HT1DE4/attachment__1789297332629277299.jpg?width=1000&quality=80",
 "s8": "https://hungerstation.dhmedia.io/image/vso-so-backend/HS_SA/HT1DE4/attachment__1789297332629277299.jpg?width=1000&quality=80",
 "d1": "https://hungerstation.dhmedia.io/image/global-menu-service/HS_SA/vendor/194512/product/139423988/df28f4b1-d1ad-4bf6-a271-52b0099aa788.jpg?width=1000&quality=80",
 "d2": "https://hungerstation.dhmedia.io/image/global-menu-service/HS_SA/vendor/194512/product/139423988/df28f4b1-d1ad-4bf6-a271-52b0099aa788.jpg?width=1000&quality=80",
 "d3": "https://hungerstation.dhmedia.io/image/vso-so-backend/HS_SA/HT1DE4/attachment__1789297332576132987?width=1000&quality=80",
 "d4": "https://hungerstation.dhmedia.io/image/vso-so-backend/HS_SA/HT1DE4/attachment__1789297332576132987?width=1000&quality=80",
 "d5": "https://hungerstation.dhmedia.io/image/vso-so-backend/HS_SA/HT1DE4/attachment__1789297332576132987?width=1000&quality=80",
 "d6": "https://hungerstation.dhmedia.io/image/vso-so-backend/HS_SA/HT1DE4/attachment__1789297332817643339.jpg?width=1000&quality=80"
}
os.makedirs(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'images', 'menu'), exist_ok=True)
for k, u in URLS.items():
    dst = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'images', 'menu', k + '.jpg')
    if os.path.exists(dst): continue
    try:
        req = urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0'})
        open(dst, 'wb').write(urllib.request.urlopen(req, timeout=30).read()); print('ok', k)
    except Exception as e:
        print('failed', k, e)
"""