import { Link } from 'react-router-dom'
import { PLATFORM_NAME } from '../brand'

const sections: { title: string; body: string[] }[] = [
  {
    title: '1. Identificación del prestador',
    body: [
      'Este servicio es operado por Luciano Yanes, venezolano, titular de la cédula de identidad N° 31.758.324, en adelante "el Prestador". Contacto: lucianoyanesmart3@gmail.com.',
    ],
  },
  {
    title: '2. Objeto del servicio',
    body: [
      `${PLATFORM_NAME} es una plataforma de software como servicio (SaaS) destinada a la gestión administrativa de clínicas odontológicas: pacientes, tratamientos, abonos, odontogramas y reportes.`,
      'El servicio es exclusivamente administrativo y de gestión. No constituye asesoría médica, diagnóstico, recomendación clínica ni sustituye el criterio profesional del odontólogo tratante. El Prestador no participa en ninguna relación médico-paciente.',
    ],
  },
  {
    title: '3. Aceptación de los términos',
    body: [
      'El uso de la plataforma implica la aceptación plena y sin reservas de estos Términos y Condiciones. Si la clínica no está de acuerdo con alguna disposición, no debe utilizar el servicio.',
      'El administrador de cada clínica declara ser mayor de edad y contar con capacidad legal para contratar en nombre de su negocio.',
    ],
  },
  {
    title: '4. Cuentas y credenciales',
    body: [
      'El acceso al panel de administración de la plataforma corresponde de forma exclusiva al Prestador. Las clínicas no reciben, poseen ni pueden obtener credenciales de administración de la plataforma.',
      'Cada clínica cuenta con una única cuenta de acceso. El titular de la clínica es el responsable exclusivo de dicha cuenta: debe mantener la confidencialidad de sus credenciales, decidir y velar por quiénes las utilizan dentro de su negocio (quedando bajo su responsabilidad todo acceso que permita), y notificar de inmediato al Prestador cualquier uso no autorizado o incidente de seguridad.',
      'Cada clínica inicia sesión con una contraseña genérica temporal provista por el Prestador y debe cambiarla en su primer inicio de uso. A partir de ese momento, la contraseña queda bajo la exclusiva custodia de la clínica.',
      'El Prestador no se responsabiliza por la pérdida, olvido o extravío de las credenciales de las clínicas, ni por los daños o incidentes de seguridad derivados de ellas. La recuperación de la contraseña se realiza únicamente mediante solicitud enviada desde el correo registrado en la cuenta; el Prestador generará una nueva contraseña temporal que la clínica deberá cambiar de inmediato.',
      'Todas las acciones realizadas desde una cuenta de clínica se consideran realizadas por el titular de dicha cuenta.',
    ],
  },
  {
    title: '5. Período de prueba y planes de pago',
    body: [
      'El servicio puede ofrecer un período de prueba gratuito con límites de duración y de cantidad de pacientes. Al finalizar el trial, el acceso queda suspendido hasta que se contrate un plan o se active la cuenta por parte del Prestador.',
      'Los planes de pago, precios y condiciones comerciales específicas se acuerdan de forma individual con cada clínica. La falta de pago faculta al Prestador para suspender o cancelar el acceso.',
    ],
  },
  {
    title: '6. Datos de los pacientes y responsabilidades',
    body: [
      'La información de pacientes, tratamientos y pagos ingresada por la clínica es y sigue siendo propiedad exclusiva de la clínica. Para los efectos de la Ley Orgánica de Protección de Datos Personales (LOPDP), la clínica actúa como responsable del tratamiento de los datos de sus pacientes, y el Prestador opera exclusivamente como encargado o operador técnico del tratamiento, por cuenta y orden de la clínica.',
      'Antes de registrar cualquier dato de un paciente en la plataforma, la clínica debe recabar su consentimiento informado, expreso, previo y por escrito, conforme a la LOPDP. Dicho consentimiento debe cubrir especialmente los datos de salud, que tienen la categoría de datos sensibles. La clínica debe conservar prueba del consentimiento y hacerlo extensivo a los profesionales que intervengan en la atención.',
      'El Prestador aplica medidas de seguridad razonables para proteger la información: transmisión cifrada (HTTPS), almacenamiento de contraseñas en forma irreversible (hash), bases de datos aisladas por clínica y mecanismos de cierre y renovación de sesiones. La clínica, a su vez, debe: usar contraseñas robustas, no compartir accesos, velar por que su personal cumpla con la confidencialidad y mantener actualizados sus datos de contacto.',
      'El Prestador reconoce y facilita el ejercicio de los derechos de los titulares de datos (acceso, rectificación, supresión y oposición) por parte de la clínica responsable. Toda solicitud de exportación o eliminación definitiva de datos podrá realizarse escribiendo al correo del Prestador, quien la ejecutará en un plazo razonable salvo obligación legal de conservación.',
    ],
  },
  {
    title: '7. Uso aceptable',
    body: [
      'La clínica se compromete a utilizar el servicio únicamente para fines lícitos y conforme a estos términos. Queda prohibido: introducir datos falsos o ilícitos, intentar acceder a cuentas ajenas, realizar ingeniería inversa, revender o explotar comercialmente el software, o usar la plataforma para actividades fraudulentas.',
      'El incumplimiento faculta la suspensión inmediata del acceso sin previo aviso y sin reembolso.',
    ],
  },
  {
    title: '8. Disponibilidad del servicio',
    body: [
      'El Prestador se esfuerza por mantener el servicio disponible, pero no garantiza operación ininterrumpida ni libre de errores. Puede realizar pausas de mantenimiento, con o sin aviso previo, cuando sea técnicamente necesario.',
      'El Prestador no responde por daños derivados de interrupciones, caídas del servicio, pérdida de datos imputable a fallas de internet, del equipo del usuario o de terceros ajenos al Prestador, salvo dolo o negligencia comprobada del Prestador.',
    ],
  },
  {
    title: '9. Propiedad intelectual',
    body: [
      `El software, código fuente, diseño de interfaz, estructura, lógica de negocio, identidad visual, marca ${PLATFORM_NAME}, nombre, documentación y cualquier componente del proyecto son propiedad exclusiva e indivisible del Prestador.`,
      'Ninguna persona que comercialice el servicio queda autorizada a copiar, clonar, reproducir, adaptar o recrear total o parcialmente el software, su interfaz o su diseño, a realizar ingeniería inversa o a registrar nombres, marcas o dominios confundibles con el servicio. Quien comercialice el servicio lo hace en calidad de intermediario y no adquiere por ello derecho alguno sobre la propiedad del proyecto.',
      'El incumplimiento de estas obligaciones dará por terminada de forma automática e inmediata la autorización para comercializar el servicio, sin perjuicio de las acciones legales, indemnizaciones por daños y medidas cautelares a que haya lugar.',
    ],
  },
  {
    title: '10. Limitación de responsabilidad',
    body: [
      'En la máxima medida permitida por la ley, la responsabilidad total del Prestador por cualquier reclamo derivado del uso del servicio se limita al monto efectivamente pagado por la clínica al Prestador durante los doce (12) meses anteriores al hecho que origine el reclamo.',
      'El Prestador no será responsable por daños indirectos, lucro cesante, pérdida de ingresos, daños morales o perjuicios clínicos derivados de decisiones médicas, del uso que la clínica dé a la información del sistema o de actuaciones de sus empleados.',
    ],
  },
  {
    title: '11. Indemnización',
    body: [
      'La clínica indemnizará al Prestador por cualquier reclamo, demanda o sanción derivada del uso indebido que haga del servicio, en particular por el tratamiento ilícito o no consentido de datos personales y de datos de salud de sus pacientes.',
    ],
  },
  {
    title: '12. Suspensión y terminación',
    body: [
      'Cualquiera de las partes puede dar por terminado el servicio. El Prestador podrá suspender o cancelar cuentas por incumplimiento de estos términos, falta de pago o uso indebido, sin derecho a reembolso.',
      'Al finalizar la relación, la clínica podrá solicitar la exportación de sus datos durante un plazo razonable; posteriormente, los datos serán eliminados de forma definitiva salvo obligación legal de conservación.',
    ],
  },
  {
    title: '13. Modificaciones',
    body: [
      'El Prestador puede actualizar estos términos y las características del servicio en cualquier momento. Los cambios sustanciales se notificarán por la plataforma o por correo electrónico con antelación razonable. El uso continuado tras la entrada en vigor implica la aceptación de la versión vigente.',
    ],
  },
  {
    title: '14. Protección de datos personales',
    body: [
      'El Prestador trata los datos de las cuentas de acceso conforme a la Ley Orgánica de Protección de Datos Personales de la República Bolivariana de Venezuela. Los datos se usan exclusivamente para operar el servicio, prestar soporte y gestionar la relación comercial.',
      'Para consultas, correcciones o eliminación de datos personales, escribir a lucianoyanesmart3@gmail.com.',
    ],
  },
  {
    title: '15. Ley aplicable y jurisdicción',
    body: [
      'Estos términos se rigen por las leyes de la República Bolivariana de Venezuela. Cualquier controversia será sometida a los tribunales competentes del domicilio del Prestador, renunciando las partes a cualquier otro fuero que pudiera corresponderles.',
    ],
  },
  {
    title: '16. Contacto',
    body: [
      'Para cualquier consulta relacionada con estos términos: lucianoyanesmart3@gmail.com.',
    ],
  },
]

export default function TerminosPage() {
  return (
    <main className="min-h-dvh bg-canvas font-sans text-ink">
      <div className="mx-auto max-w-3xl px-6 py-12 lg:px-10 lg:py-16">
        <Link
          to="/"
          className="text-sm text-muted underline-offset-2 hover:text-ink hover:underline"
        >
          ← Volver al inicio
        </Link>

        <h1
          className="mt-8 font-display text-4xl font-normal leading-tight tracking-tight text-ink"
          style={{ fontVariationSettings: "'opsz' 144" }}
        >
          Términos y condiciones
        </h1>
        <p className="mt-3 text-sm text-muted">
          Última actualización: 13 de octubre de 2026 · {PLATFORM_NAME}
        </p>

        <p className="mt-8 text-[15px] leading-relaxed text-muted">
          Estos términos regulan el acceso y uso de la plataforma{' '}
          <span className="font-semibold text-ink">{PLATFORM_NAME}</span>. Lea
          con atención; al crear una cuenta o utilizar el servicio declara
          haberlos leído y aceptado.
        </p>

        <div className="mt-10 space-y-9">
          {sections.map(section => (
            <section key={section.title}>
              <h2 className="text-base font-bold tracking-tight text-ink">
                {section.title}
              </h2>
              {section.body.map((paragraph, i) => (
                <p
                  key={i}
                  className="mt-2.5 text-[15px] leading-relaxed text-muted"
                >
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>

        <p className="mt-12 border-t border-divider pt-6 text-xs text-muted">
          Documento informativo con fines de protección legal del prestador del
          servicio. Úsese conforme a la legislación venezolana vigente.
        </p>
      </div>
    </main>
  )
}
