import { FileText } from 'lucide-react'

export default function DescriptionSection({ formData, setFormData }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-50 rounded-lg">
                    <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-gray-900">Description</h3>
                    <p className="text-sm text-gray-500">Tell participants about your event</p>
                </div>
            </div>

            <div>
                <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Provide a detailed description of your event. What is it about? What will participants do?&#10;&#10;Example: Join us for an exciting 24-hour hackathon where you'll build innovative solutions to real-world problems..."
                    rows={6}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                />
                <p className="text-xs text-gray-500 mt-2">
                    {formData.description?.length || 0} characters
                </p>
            </div>
        </div>
    )
}
