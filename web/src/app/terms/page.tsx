'use client';

import Link from 'next/link';
import Header from '@/components/Header';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link 
          href="/login" 
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          返回登录
        </Link>

        <h1 className="text-3xl font-bold mb-8">服务条款与免责声明</h1>

        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-white/70">
          <p className="text-white/50 text-sm">
            最后更新：2024年12月
          </p>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. 服务性质</h2>
            <p>
              RyanVan Z-Image（以下简称"本服务"）是一个<strong className="text-white">免费公益性质</strong>的 AI 图像生成演示项目，
              仅供技术学习、学术研究和个人非商业用途使用。本服务不收取任何费用，也不提供任何商业服务或商业保证。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. 服务范围</h2>
            <p>
              根据中华人民共和国国家互联网信息办公室等七部门发布的
              <a 
                href="https://www.cac.gov.cn/2023-07/13/c_1690898327029107.htm" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-indigo-400 hover:text-indigo-300"
              >
                《生成式人工智能服务管理暂行办法》
              </a>
              相关规定，不向中华人民共和国大陆地区用户提供服务。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. 使用限制</h2>
            <p>您同意在使用本服务时遵守以下规定：</p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>仅将生成的图像用于合法的学习、研究或个人非商业用途</li>
              <li>不生成任何违反当地法律法规的内容</li>
              <li>不生成涉及色情、暴力、仇恨、歧视或其他有害内容</li>
              <li>不生成侵犯他人知识产权、肖像权或隐私权的内容</li>
              <li>不将本服务用于任何商业目的或盈利活动</li>
              <li>不尝试破坏、干扰或滥用本服务</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. 内容责任</h2>
            <p>
              用户对其输入的提示词（Prompt）和生成的图像内容承担全部责任。
              本服务运营者不对用户生成的任何内容负责，也不对因使用生成内容而产生的任何后果负责。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. 免责声明</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>本服务按"现状"提供，不提供任何明示或暗示的保证</li>
              <li>本服务可能随时中断、修改或终止，恕不另行通知</li>
              <li>运营者不对服务的可用性、准确性、可靠性或适用性作任何保证</li>
              <li>运营者不对因使用本服务而导致的任何直接或间接损失负责</li>
              <li>生成的图像可能包含错误、偏见或不当内容，用户应自行判断和审核</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. 隐私说明</h2>
            <p>
              本服务通过 Linux DO Connect 进行身份验证，仅获取必要的用户基本信息（用户名、头像等）用于服务功能。
              您生成的图像和提示词可能被记录用于服务运维和安全审计目的。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. 知识产权</h2>
            <p>
              本服务使用的 AI 模型（Z-Image-Turbo）由通义团队开发。用户生成的图像版权归属请参考相关模型的使用协议。
              本服务不对生成图像的版权归属作任何声明或保证。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. 条款变更</h2>
            <p>
              运营者保留随时修改本服务条款的权利。继续使用本服务即表示您接受修改后的条款。
            </p>
          </section>

          <section className="border-t border-white/10 pt-6 mt-8">
            <p className="text-white/50 text-sm">
              使用本服务即表示您已阅读、理解并同意以上全部条款。如您不同意任何条款，请勿使用本服务。
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
