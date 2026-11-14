# İleri Seviye Agent Deployment

*(Bu bir placeholder modül: şimdilik kısa bir özet, tam ders içeriği yakında geliyor.)*

Bir agent'ı tek seferlik bir script ya da chat oturumu olarak değil, gerçek bir production servisi olarak çalıştırmak. Agent bir server'ın arkasında çalışır, bir şey bozulduğunda durumunu korur ve işini yalıtılmış bir alanda yapar; böylece yazdığı kod ve kontrol ettiği bilgisayar, çalıştığı ana makineye zarar veremez.

**Bu modülde işlenecek konular**:
- Agent server'lar ve LangChain Agent Protocol
- Bir agent servisinin arkasındaki yapı: API, kuyruk ve Redis worker'ları
- Runtime: checkpoint'ler, hata toleransı ve time travel
- Production'da human in the loop: interrupt'lar ve yönlendirme (steering)
- Computer use: bir tarayıcıyı ya da masaüstünü kontrol eden agent'lar
- Sandbox'lar: bir agent'ın yazdığı kodu çalıştırdığı yer
- Container'lar ve microVM'ler (Firecracker, gVisor): her birinin sağladığı yalıtım
- Agent'lar için barındırılan sandbox'lar: E2B ve Daytona gibi
