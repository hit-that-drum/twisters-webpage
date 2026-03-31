import type { ReactElement } from 'react';
import { FaPhoneSquareAlt } from 'react-icons/fa';
import { FaMapLocationDot } from 'react-icons/fa6';
import { IoPersonCircle, IoSchoolSharp } from 'react-icons/io5';
import { MdMarkEmailRead } from 'react-icons/md';
import { TbCertificate, TbLanguage, TbSchool } from 'react-icons/tb';
import {
  skillCategories,
  socialLinks,
  timeline,
  educationItems,
  certificationItems,
  languageItems,
} from './Resume/ResumeSchema';

export default function ResumeHomeForTestUser() {
  return (
    <div className="min-h-screen text-stone-900">
      <main>
        <section
          id="home"
          className="mx-auto flex max-w-7xl flex-col items-center px-6 py-20 text-center md:py-32 lg:px-8"
        >
          <div className="mb-6 inline-flex rounded-full bg-amber-100 px-4 py-1.5 text-sm font-semibold tracking-wide text-amber-800">
            JUNIOR FRONTEND DEVELOPER
          </div>

          <h1 className="mb-8 text-3xl font-black leading-none tracking-tight text-stone-900 md:text-7xl lg:text-8xl">
            김혜영 <br />
            <span className="italic text-amber-600">Portfolio</span>
          </h1>

          <p className="mb-12 max-w-3xl text-lg leading-8 text-stone-600 md:text-lg">
            React/Typescript 기반 백오피스와 웹뷰 경험으로 기능을 안정적으로 구현하는 프론트엔드
            개발자
          </p>

          {/* <div className="flex flex-col gap-4 sm:flex-row">
            <button className="rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 px-8 py-4 text-lg font-bold text-white shadow-lg shadow-amber-200 transition hover:brightness-105">
              Check My Work
            </button>
            <button className="rounded-xl border border-stone-300 bg-white px-8 py-4 text-lg font-bold text-stone-900 transition hover:bg-stone-100">
              Download CV
            </button>
          </div> */}
        </section>

        <section id="about" className="bg-stone-100 py-24">
          <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 px-6 md:grid-cols-2 lg:gap-20 lg:px-8">
            <div className="relative">
              <div className="aspect-square overflow-hidden rounded-3xl shadow-2xl shadow-stone-300/40 grayscale transition duration-700 hover:grayscale-0">
                <img
                  src="https://media.istockphoto.com/id/1450561609/photo/cherries-cherry-isolated-cherries-top-view-sour-cherry-with-leaves-on-white-background-with.jpg?s=612x612&w=0&k=20&c=9cVABQg8u_iqDg0AdpvaxuZJZ4Ew03EzB3fAY_LAPYI="
                  alt="Professional portrait"
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="absolute -bottom-6 -right-6 hidden rounded-3xl bg-amber-600 p-8 text-white shadow-xl md:block">
                <span className="block text-4xl font-black">3+</span>
                <span className="text-xs uppercase tracking-[0.2em] text-amber-100">
                  Years of Experience
                </span>
              </div>
            </div>

            <div>
              <h2 className="mb-8 text-4xl font-black tracking-tight text-stone-900">
                <span className="text-amber-600">Introduction</span>
              </h2>
              <p className="mb-12 text-lg leading-8 text-stone-600">
                엔터테인먼트 계열의 회사에서 홍보팀으로의 경험과 작게는 전시회, 크게는 국제 행사까지
                담당했던 행사 담당 경험을 통해 다수의 이해관계자들간의 소통을 조율하며 명확한
                커뮤니케이션의 중요성을 체감했습니다. 모종의 계기로 개발로 직무전환을 마음먹고
                한국방송통신대학교 컴퓨터과학과에 진학하였으며 좀 더 빠른 실무 적응을 위해
                코드스테이츠의 웹개발 부트캠프를 반 년간 수료한 뒤 현대벤디스에 입사하게 되었습니다.
                부트캠프를 하며 팀프로젝트를 진행하였을 때도, 현대벤디스에서의 웹 프론트엔드로
                재직하였을 때도, 부족한 부분이 있을 때는 질문하는 것을 주저하지 않고 팀원 및
                동료들과 도움을 주고받으며 맡은 바 업무를 완수해 내었습니다. 첫 직장에서 메인이 되는
                '식권대장' 앱을 기반으로 삼아 그와 엮여있는 여러가지 웹사이트를 운영하는 환경에서
                재무, 세일즈, 마케팅, 서비스기획, 백엔드, 인프라, 보안에 이르는 각각의 팀과 긴밀히
                소통하며 2주 스프린트 개발 방식에 적응하여 사용자 피드백을 반영해 개발업무를
                진행하였습니다.
              </p>

              <div className="grid grid-cols-1 gap-x-10 gap-y-6 sm:grid-cols-2">
                {(
                  [
                    [<IoPersonCircle size="30px" />, 'Name', '김혜영'],
                    [<FaMapLocationDot size="30px" />, 'Location', '서울특별시 중구'],
                    [<FaPhoneSquareAlt size="30px" />, 'Phone', '010-6385-3530'],
                    [<MdMarkEmailRead size="30px" />, 'Email', 'velvetredvelvet91@gmail.com'],
                  ] as Array<[ReactElement, string, string]>
                ).map(([icon, label, value]) => (
                  <div key={label} className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-amber-600">{icon}</span>
                    <div>
                      <span className="block text-xs font-bold uppercase tracking-[0.2em] text-stone-500">
                        {label}
                      </span>
                      <span className="font-semibold text-stone-900">{value}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-x-10 gap-y-6 sm:grid-cols-1 mt-6">
                <div key="Education" className="flex items-center gap-4">
                  <span className="material-symbols-outlined text-amber-600">
                    <IoSchoolSharp size="30px" />
                  </span>
                  <div>
                    <span className="block text-xs font-bold uppercase tracking-[0.2em] text-stone-500">
                      Education
                    </span>
                    <div className="font-semibold text-stone-900">
                      • 한양대학교 ERICA 중국학부 전공, 신문방송학 부전공
                    </div>
                    <div className="font-semibold text-stone-900">
                      • 한국방송통신대학교 컴퓨터과학과 전공, 법학과 복수전공
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="skills" className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
          <div className="mb-16 text-center">
            <h2 className="text-4xl font-black tracking-tight text-stone-900">
              Technical <span className="text-amber-600">SKILLS</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {skillCategories.map((category, index) => (
              <div
                key={category.title}
                className="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-sm">
                  <img src={category.icon} />
                </div>
                <h3 className="mt-6 text-xl font-bold text-stone-900">{category.title}</h3>
                <div className="mt-6 flex flex-wrap gap-2">
                  {category.items.map((item, itemIndex) => (
                    <span
                      key={item}
                      className={[
                        'rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide',
                        (index + itemIndex) % 2 === 0
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-stone-200 text-stone-800',
                      ].join(' ')}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-stone-950 py-20 text-white">
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-6 md:grid-cols-2 lg:grid-cols-2 lg:px-8">
            {socialLinks.map((item) => (
              <a
                key={item.title}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-3xl border border-white/10 p-8 transition hover:bg-white/5"
              >
                <span className="material-symbols-outlined mb-4 block text-3xl text-amber-400">
                  {item.icon}
                </span>
                <h4 className="text-lg font-bold">{item.title}</h4>
                <p className="mt-2 text-sm leading-6 text-white/60">{item.description}</p>
              </a>
            ))}
          </div>
        </section>

        {/* <section id="projects" className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
            {projects.map((project) => (
              <div key={project.title} className="group">
                <div className="mb-6 aspect-video overflow-hidden rounded-3xl bg-stone-200 shadow-lg shadow-stone-300/30">
                  <img
                    src={project.image}
                    alt={project.title}
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  />
                </div>

                <div className="mb-4 flex gap-3">
                  {project.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded bg-stone-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-stone-800"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <h3 className="mb-3 text-2xl font-bold text-stone-900 transition group-hover:text-amber-600">
                  {project.title}
                </h3>
                <p className="mb-6 leading-7 text-stone-600">{project.description}</p>

                <div className="flex items-center gap-6">
                  {project.links.map((link, index) => (
                    <a
                      key={link.label}
                      href={link.href}
                      className={
                        index === 0
                          ? 'text-sm font-bold text-amber-600 hover:underline'
                          : 'text-sm font-bold text-stone-900 hover:underline'
                      }
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section> */}

        <section id="career" className="bg-stone-100 py-24">
          <div className="mx-auto max-w-4xl px-6 lg:px-8">
            <div className="mb-16 text-center">
              <h2 className="text-4xl font-black tracking-tight text-stone-900">
                Professional <span className="text-amber-600">Journey</span>
              </h2>
              {/* <p className="mt-4 text-stone-600">
                The path of technical growth and institutional impact.
              </p> */}
            </div>

            <div className="space-y-16">
              {timeline.map((companyItem) => (
                <div
                  key={`${companyItem.company}-${companyItem.period}`}
                  className="relative border-l-2 border-stone-300 pl-12"
                >
                  <div
                    className={[
                      'absolute -left-[11px] top-1 h-5 w-5 rounded-full ring-4 ring-stone-100',
                      companyItem.active ? 'bg-amber-600' : 'bg-stone-300',
                    ].join(' ')}
                  />

                  {/* 회사 정보 */}
                  <div className="mb-6">
                    <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
                      <div>
                        <h3 className="text-2xl font-bold text-stone-900">{companyItem.company}</h3>
                        <p className="mt-1 text-base font-semibold text-amber-600">
                          {companyItem.role}
                          {companyItem.employmentType ? ` · ${companyItem.employmentType}` : ''}
                        </p>
                      </div>

                      <span className="text-sm font-bold uppercase tracking-[0.2em] text-stone-500">
                        {companyItem.period}
                      </span>
                    </div>

                    <ul className="mt-4 space-y-2 text-sm leading-7 text-stone-600">
                      {companyItem.summary.map((text) => (
                        <li key={text} className="flex gap-2">
                          <span className="mt-1 text-amber-600">•</span>
                          <span>{text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 서브 태스크 */}
                  {companyItem.subTasks && companyItem.subTasks.length > 0 && (
                    <div className="space-y-6 border-l border-stone-200 pl-6">
                      {companyItem.subTasks.map((task) => (
                        <div key={`${task.title}-${task.period}`} className="relative">
                          <div className="mb-2 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                            <h4 className="text-lg font-bold text-stone-800">[{task.title}]</h4>
                            <span className="text-xs font-semibold text-stone-500">
                              {task.period}
                            </span>
                          </div>

                          {task.tech && task.tech.length > 0 && (
                            <div className="mb-3 flex flex-wrap gap-2">
                              {task.tech.map((tech) => (
                                <span
                                  key={tech}
                                  className="rounded-full bg-stone-200 px-3 py-1 text-xs font-semibold text-stone-700"
                                >
                                  {tech}
                                </span>
                              ))}
                            </div>
                          )}

                          <ul className="space-y-2 text-sm leading-6 text-stone-600">
                            {task.details.map((detail) => (
                              <li key={detail} className="flex gap-2">
                                <span className="mt-1 text-amber-600">•</span>
                                <span>{detail}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="education" className="py-24">
          <div className="mx-auto max-w-4xl px-6 lg:px-8">
            <div className="mb-16 text-center">
              <h2 className="text-4xl font-black tracking-tight text-stone-900">
                Education <span className="text-amber-600">Background</span>
              </h2>
            </div>

            <div className="space-y-12">
              {educationItems.map((item) => (
                <div
                  key={`${item.school}-${item.period}`}
                  className="relative border-l-2 border-stone-300 pl-12"
                >
                  {item.icon ? (
                    <div className="absolute -left-[18px] w-[35px] h-[35px] rounded-full ring-4 ring-stone-50 overflow-hidden">
                      <img src={item.icon} className="w-full h-full object-cover" alt="icon" />
                    </div>
                  ) : (
                    <div className="absolute -left-[18px] w-[35px] h-[35px] rounded-full bg-gray-100 ring-4 ring-stone-50 flex items-center justify-center">
                      <TbSchool className="text-gray-400 text-lg" />
                    </div>
                  )}

                  <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-stone-900">{item.school}</h3>
                      <p className="mt-1 text-base font-semibold text-amber-600">
                        {item.status}
                        {item.course ? ` · ${item.course}` : ''}
                      </p>
                    </div>

                    <span className="text-sm font-bold uppercase tracking-[0.2em] text-stone-500">
                      {item.period}
                    </span>
                  </div>

                  {(item.major || item.minor) && (
                    <div className="mb-4 space-y-1 text-sm text-stone-700">
                      {item.major && (
                        <p>
                          <span className="font-semibold text-stone-900">전공</span> · {item.major}
                        </p>
                      )}
                      {item.minor && (
                        <p>
                          <span className="font-semibold text-stone-900">부전공/복수전공</span> ·{' '}
                          {item.minor}
                        </p>
                      )}
                    </div>
                  )}

                  {item.summary && item.summary.length > 0 && (
                    <ul className="mb-4 space-y-2 text-sm leading-7 text-stone-600">
                      {item.summary.map((text) => (
                        <li key={text} className="flex gap-2">
                          <span className="mt-1 text-amber-600">•</span>
                          <span>{text}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {item.details && item.details.length > 0 && (
                    <ul className="space-y-2 text-sm leading-7 text-stone-600">
                      {item.details.map((detail) => (
                        <li key={detail} className="flex gap-2">
                          <span className="mt-1 text-amber-600">•</span>
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="certification" className="bg-stone-50 py-24">
          <div className="mx-auto max-w-4xl px-6 lg:px-8">
            <div className="mb-16 text-center">
              <h2 className="text-4xl font-black tracking-tight text-stone-900">
                Certification <span className="text-amber-600">License</span>
              </h2>
            </div>

            <div className="space-y-10">
              {certificationItems.map((item) => (
                <div
                  key={`${item.name}-${item.period}`}
                  className="relative border-l-2 border-stone-300 pl-12"
                >
                  <div className="absolute -left-[18px] top-1 w-[35px] h-[35px] rounded-full bg-gray-100 ring-4 ring-stone-50 flex items-center justify-center">
                    <TbCertificate className="text-gray-400 text-lg" />
                  </div>

                  <div className="mb-2 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                    <h3 className="text-xl font-bold text-stone-900">{item.name}</h3>
                    <span className="text-sm font-bold text-stone-500">{item.period}</span>
                  </div>

                  {item.issuer && (
                    <p className="mb-3 text-sm font-semibold text-amber-600">{item.issuer}</p>
                  )}

                  {item.description && (
                    <ul className="space-y-2 text-sm text-stone-600">
                      {item.description.map((desc) => (
                        <li key={desc} className="flex gap-2">
                          <span className="text-amber-600">•</span>
                          <span>{desc}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="languages" className=" py-24">
          <div className="mx-auto max-w-4xl px-6 lg:px-8">
            <div className="mb-16 text-center">
              <h2 className="text-4xl font-black tracking-tight text-stone-900">
                Language <span className="text-amber-600">Skills</span>
              </h2>
            </div>

            <div className="space-y-10">
              {languageItems.map((item) => (
                <div key={item.language} className="relative border-l-2 border-stone-300 pl-12">
                  <div className="absolute -left-[18px] top-1 flex h-[35px] w-[35px] items-center justify-center rounded-full bg-gray-100 ring-4 ring-stone-50">
                    <TbLanguage className="text-lg text-gray-400" />
                  </div>

                  <div className="mb-3">
                    <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                      <h3 className="text-xl font-bold text-stone-900">{item.language}</h3>
                      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                        <span className="text-sm font-semibold text-amber-600">
                          {item.levelOne}
                        </span>
                        {item?.levelTwo ? (
                          <span className="text-sm font-semibold text-amber-600">
                            {item.levelTwo}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {item.certificates && item.certificates.length > 0 && (
                    <div className="space-y-2">
                      {item.certificates.map((cert) => (
                        <div
                          key={`${cert.name}-${cert.score}-${cert.date}`}
                          className="flex flex-col gap-1 rounded-xl bg-white px-4 py-3 text-sm text-stone-600 shadow-sm md:flex-row md:items-center md:justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-stone-900">{cert.name}</span>
                            {cert.score && <span>{cert.score}</span>}
                          </div>
                          {cert.date && (
                            <span className="text-xs font-medium text-stone-500">{cert.date}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {item.description && item.description.length > 0 && (
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-stone-600">
                      {item.description.map((desc) => (
                        <li key={desc} className="flex gap-2">
                          <span className="text-amber-600">•</span>
                          <span>{desc}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
