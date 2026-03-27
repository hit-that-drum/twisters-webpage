export default function NotFoundComponent() {
  return (
    <>
      <style>
        {`
          @keyframes swing {
            0% { transform: rotate(40deg); }
            50% { transform: rotate(-40deg); }
            100% { transform: rotate(40deg); }
          }

          @keyframes riseSlow {
            0% { transform: translateY(0); }
            100% { transform: translateY(-2000px); }
          }

          @keyframes riseFast {
            0% { transform: translateY(0); }
            100% { transform: translateY(-2000px); }
          }
        `}
      </style>

      <div className="relative min-h-screen overflow-hidden bg-[#181828] text-white">
        <div className="absolute left-0 top-0 h-1 w-full bg-[url('https://1.bp.blogspot.com/-gxsOcYWghHA/Xp_izTh4sFI/AAAAAAAAU8s/y637Fwg99qAuzW9na_NT_uApny8Vce95gCEwYBhgL/s1600/header-footer-gradient-bg.png')] bg-repeat-x bg-contain opacity-50" />

        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute h-[3px] w-[3px] bg-transparent"
            style={{
              boxShadow:
                '571px 173px #ffd166, 1732px 143px #ffd166, 1745px 454px #FF5722, 234px 784px #ffd166, 1793px 1123px #FF9800, 1076px 504px #03A9F4, 633px 601px #FF5722, 350px 630px #FFEB3B, 1164px 782px #ffd166, 76px 690px #3F51B5, 1825px 701px #CDDC39, 1646px 578px #FFEB3B, 544px 293px #2196F3, 445px 1061px #673AB7, 928px 47px #ffd166, 168px 1410px #8BC34A, 777px 782px #9C27B0, 1235px 1941px #9C27B0, 104px 1690px #8BC34A, 1167px 1338px #E91E63, 345px 1652px #009688, 1682px 1196px #F44336, 1995px 494px #8BC34A, 428px 798px #FF5722, 340px 1623px #F44336, 605px 349px #9C27B0',
              animation: 'riseSlow 150s linear infinite',
            }}
          />
          <div
            className="absolute h-[2px] w-[2px] bg-transparent"
            style={{
              boxShadow:
                '340px 505px #FFF, 1700px 39px #FFF, 1768px 516px #F44336, 849px 391px #FF9800, 228px 1824px #FFF, 1119px 1680px #FFC107, 812px 1480px #3F51B5, 1438px 1585px #CDDC39, 137px 1397px #FFF, 1080px 456px #673AB7, 1208px 1437px #03A9F4, 857px 281px #F44336, 1254px 1306px #CDDC39, 987px 990px #4CAF50, 1655px 911px #00BCD4, 1102px 1216px #FF5722',
              animation: 'riseFast 50s linear infinite',
            }}
          />
          <div
            className="absolute h-[1px] w-[1px] bg-transparent"
            style={{
              boxShadow:
                '709px 1756px #ffd166, 1972px 248px #FFF, 1669px 1344px #FF5722, 1132px 406px #F44336, 320px 1076px #CDDC39, 126px 943px #FFEB3B, 263px 604px #FF5722, 1546px 692px #F44336',
              animation: 'riseSlow 80s linear infinite',
            }}
          />
        </div>

        <div className="pointer-events-none absolute left-1/2 top-0 z-10 flex w-[180px] -translate-x-1/2 origin-top flex-col items-center md:w-[220px] lg:w-[300px]">
          <div
            className="flex w-full origin-top flex-col items-center"
            style={{ animation: 'swing 5.1s cubic-bezier(0.6, 0, 0.38, 1) infinite' }}
          >
            {/* rope */}
            <div className="h-[180px] w-[6px] bg-[linear-gradient(rgba(255,209,102,0.7),rgb(193,65,25))] md:h-[220px] md:w-[8px] lg:h-[248px]" />

            {/* lamp head */}
            <div className="relative h-[60px] w-[120px] rounded-t-full bg-[#ffd166] md:h-[70px] md:w-[160px] lg:h-[80px] lg:w-[200px]" />

            {/* lamp base */}
            <div className="relative -mt-2 h-[18px] w-[120px] rounded-full bg-[#ffdd88] md:w-[160px] lg:w-[200px]">
              <div className="absolute left-1/2 top-1/2 h-[34px] w-[34px] -translate-x-1/2 translate-y-1 rounded-full bg-[#fff3c4] shadow-[0_0_25px_7px_rgba(255,209,102,0.8),0_0_64px_47px_rgba(255,209,102,0.5),0_0_30px_15px_rgba(255,209,102,0.2)] md:h-[42px] md:w-[42px] lg:h-[50px] lg:w-[50px]" />
            </div>

            {/* light beam */}
            <div className="absolute top-[210px] h-0 w-[140px] rounded-t-[90px] border-b-[500px] border-b-[rgba(255,209,102,0.25)] border-l-[35px] border-r-[35px] border-l-transparent border-r-transparent md:top-[250px] md:w-[180px] md:border-b-[700px] lg:top-[270px] lg:w-[200px] lg:border-b-[900px] lg:border-l-[50px] lg:border-r-[50px]" />
          </div>
        </div>

        <section className="relative z-20 flex min-h-screen items-center justify-center px-6 py-24 text-center">
          <div className="mx-auto w-full max-w-4xl pt-[260px] md:pt-[300px] lg:pt-0">
            <h1 className="mx-auto max-w-4xl pb-6 text-4xl font-black uppercase tracking-[0.2em] text-white md:text-6xl">
              Page Not Found
            </h1>

            <p className="mx-auto max-w-2xl text-base leading-8 text-slate-200 md:text-lg md:leading-10">
              We&apos;re sorry, the page you were looking for isn&apos;t found here.
            </p>

            <div className="mt-10">
              <a
                href="/"
                className="inline-flex h-12 items-center justify-center overflow-hidden border border-white px-8 text-sm font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-white hover:text-[#181828]"
              >
                Home Page
              </a>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
