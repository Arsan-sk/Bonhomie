import { Shield, Info } from 'lucide-react'

export default function RulesSection({ formData, setFormData }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-orange-50 rounded-lg">
                    <Shield className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-gray-900">Rules & Regulations</h3>
                    <p className="text-sm text-gray-500">Define the rules participants must follow</p>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-blue-800">
                        <strong>Markdown Supported:</strong> You can use markdown formatting like **bold**, *italic*, lists, etc.
                    </p>
                </div>

                <textarea
                    value={formData.rules || ''}
                    onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                    placeholder={'# Rules\n1. All participants must register before the deadline\n2. Teams must have the specified number of members\n3. No external help is allowed\n\n## Guidelines\n- Be respectful to all participants\n- Follow the code of conduct\n- Submit your work on time'}
                    rows={10}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all resize-none font-mono text-sm"
                />
                <p className="text-xs text-gray-500">
                    {formData.rules?.length || 0} characters • Markdown formatting will be rendered for participants
                </p>
            </div>
        </div>
    )
}
